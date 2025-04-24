import { NextResponse } from 'next/server';

// 處理獲取附近餐廳的請求
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { location, excludePlaceIds = [] } = body;

    // 檢查是否提供了位置信息
    if (!location) {
      // 如果沒有位置信息，返回一些隨機的餐廳（不基於位置）
      return NextResponse.json({ 
        restaurants: await getRandomRestaurants(excludePlaceIds) 
      });
    }

    // 獲取環境變數中的 Google Maps API Key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: '未設置 Google Maps API Key' },
        { status: 500 }
      );
    }

    // 構建 Google Places API 的 URL
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.append('location', `${location.lat},${location.lng}`);
    url.searchParams.append('radius', '1500'); // 1.5公里範圍內
    url.searchParams.append('type', 'restaurant');
    url.searchParams.append('key', apiKey);
    url.searchParams.append('language', 'zh-TW');

    // 發送請求到 Google Places API
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API 錯誤:', data.status, data.error_message);
      return NextResponse.json(
        { error: `Google Places API 錯誤: ${data.status}` },
        { status: 500 }
      );
    }

    // 定義餐廳介面
    interface Restaurant {
      place_id: string;
      name: string;
      vicinity: string;
      rating?: number;
      user_ratings_total?: number;
      photos?: { photo_reference: string }[];
      geometry: {
        location: {
          lat: number;
          lng: number;
        }
      };
    }

    // 過濾掉已經顯示過的餐廳
    let filteredResults = (data.results || []) as Restaurant[];
    if (excludePlaceIds && excludePlaceIds.length > 0) {
      filteredResults = filteredResults.filter(
        (restaurant: Restaurant) => !excludePlaceIds.includes(restaurant.place_id)
      );
    }

    return NextResponse.json({ restaurants: filteredResults });
  } catch (error) {
    console.error('處理請求時出錯:', error);
    return NextResponse.json(
      { error: '處理請求時出錯' },
      { status: 500 }
    );
  }
}

// 如果沒有位置信息，獲取一些隨機餐廳
async function getRandomRestaurants(excludePlaceIds: string[] = []) {
  // 這裡可以實現一個備用的餐廳列表，或者從其他 API 獲取
  // 為了簡單起見，我們這裡返回一些硬編碼的餐廳數據
  const fallbackRestaurants = [
    {
      place_id: 'fallback_1',
      name: '鼎泰豐',
      vicinity: '台北市信義區松高路11號',
      rating: 4.5,
      user_ratings_total: 1000,
      geometry: {
        location: {
          lat: 25.0339639,
          lng: 121.5644722
        }
      }
    },
    {
      place_id: 'fallback_2',
      name: '添好運點心專門店',
      vicinity: '台北市信義區松壽路2號',
      rating: 4.3,
      user_ratings_total: 800,
      geometry: {
        location: {
          lat: 25.0359639,
          lng: 121.5674722
        }
      }
    },
    {
      place_id: 'fallback_3',
      name: '鼎王麻辣鍋',
      vicinity: '台中市西屯區河南路二段256號',
      rating: 4.4,
      user_ratings_total: 900,
      geometry: {
        location: {
          lat: 24.1654639,
          lng: 120.6464722
        }
      }
    },
    {
      place_id: 'fallback_4',
      name: '無老鍋',
      vicinity: '台北市中山區中山北路二段39巷3號',
      rating: 4.2,
      user_ratings_total: 750,
      geometry: {
        location: {
          lat: 25.0539639,
          lng: 121.5244722
        }
      }
    },
    {
      place_id: 'fallback_5',
      name: '欣葉台菜',
      vicinity: '台北市中正區忠孝西路一段38號',
      rating: 4.1,
      user_ratings_total: 650,
      geometry: {
        location: {
          lat: 25.0459639,
          lng: 121.5144722
        }
      }
    },
    {
      place_id: 'fallback_6',
      name: '春水堂',
      vicinity: '台中市西區英才路534號',
      rating: 4.0,
      user_ratings_total: 600,
      geometry: {
        location: {
          lat: 24.1554639,
          lng: 120.6564722
        }
      }
    }
  ];

  // 過濾掉已經顯示過的餐廳
  const filteredRestaurants = fallbackRestaurants.filter(
    restaurant => !excludePlaceIds.includes(restaurant.place_id)
  );

  // 如果過濾後沒有餐廳了，重新使用所有餐廳
  return filteredRestaurants.length > 0 ? filteredRestaurants : fallbackRestaurants;
}
