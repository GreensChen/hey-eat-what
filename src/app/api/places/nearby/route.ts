import { NextResponse } from 'next/server';

// 處理獲取附近餐廳的請求
export async function GET(request: Request) {
  try {
    // 從 URL 參數中獲取位置信息
    const url = new URL(request.url);
    const location = url.searchParams.get('location');
    const excludePlaceIds = url.searchParams.get('excludePlaceIds');
    
    // 解析排除的餐廳 ID 列表
    let excludeIds: string[] = [];
    if (excludePlaceIds) {
      try {
        excludeIds = JSON.parse(excludePlaceIds);
      } catch (e) {
        console.error('解析 excludePlaceIds 時出錯:', e);
      }
    }

    // 檢查是否提供了位置信息
    if (!location) {
      return NextResponse.json(
        { error: '缺少必要的位置參數' },
        { status: 400 }
      );
    }

    // 獲取環境變數中的 Google Maps API Key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: '未設置 Google Maps API Key' },
        { status: 500 }
      );
    }

    // 使用新版 Google Places API 搜尋附近餐廳
    const [lat, lng] = location.split(',');
    
    // 構建搜尋查詢
    const searchQuery = `餐廳 附近 ${lat},${lng}`;
    
    // 使用新版 Places API 的 searchText 端點
    // 先嘗試使用新版 API
    let response;
    try {
      response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.location'
        },
        body: JSON.stringify({
          'textQuery': searchQuery,
          'languageCode': 'zh-TW',
          'locationBias': {
            'circle': {
              'center': {
                'latitude': parseFloat(lat),
                'longitude': parseFloat(lng)
              },
              'radius': 1500.0  // 1.5公里範圍
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`新版 API 請求失敗: ${response.status}`);
      }
    } catch (error) {
      console.error('嘗試使用新版 API 時出錯:', error);
      
      // 如果新版 API 失敗，嘗試使用舊版 API
      console.log('切換到舊版 API...');
      const nearbyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      nearbyUrl.searchParams.append('location', location);
      nearbyUrl.searchParams.append('radius', '1500'); // 1.5公里範圍內
      nearbyUrl.searchParams.append('type', 'restaurant');
      nearbyUrl.searchParams.append('key', apiKey);
      nearbyUrl.searchParams.append('language', 'zh-TW');

      response = await fetch(nearbyUrl.toString());
      
      if (!response.ok) {
        throw new Error(`舊版 API 請求失敗: ${response.status}`);
      }
    }

    // 解析回應數據
    const data = await response.json();
    console.log('獲取到的數據:', JSON.stringify(data).substring(0, 200) + '...');
    
    // 檢查是否是舊版 API 回應格式
    const isOldApiResponse = data.status !== undefined;

    // 定義新版 Google Places API 的餐廳介面
    interface NewPlaceResult {
      id: string;
      displayName: {
        text: string;
      };
      formattedAddress: string;
      rating?: number;
      userRatingCount?: number;
      photos?: {
        name: string;
        widthPx?: number;
        heightPx?: number;
      }[];
      location?: {
        latitude: number;
        longitude: number;
      };
    }

    // 定義舊版 API 的餐廳結果介面
    interface OldApiPlace {
      place_id: string;
      name: string;
      vicinity?: string;
      formatted_address?: string;
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

    // 定義舊版 Restaurant 介面，用於與前端兼容
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

    // 根據 API 回應格式處理數據
    let convertedResults: Restaurant[] = [];
    
    if (isOldApiResponse) {
      // 舊版 API 回應格式處理
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        return await fallbackToTextSearch(location, apiKey, excludeIds);
      }
      
      convertedResults = data.results.map((place: OldApiPlace) => ({
        place_id: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        photos: place.photos ? place.photos.map((photo: { photo_reference: string }) => ({
          photo_reference: photo.photo_reference
        })) : undefined,
        geometry: {
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          }
        }
      }));
    } else {
      // 新版 API 回應格式處理
      if (!data.places || data.places.length === 0) {
        return await fallbackToTextSearch(location, apiKey, excludeIds);
      }
      
      convertedResults = data.places.map((place: NewPlaceResult) => {
        return {
          place_id: place.id,
          name: place.displayName.text,
          vicinity: place.formattedAddress,
          rating: place.rating,
          user_ratings_total: place.userRatingCount,
          photos: place.photos ? place.photos.map(photo => ({
            photo_reference: photo.name
          })) : undefined,
          geometry: {
            location: place.location ? {
              lat: place.location.latitude,
              lng: place.location.longitude
            } : { lat: 0, lng: 0 }
          }
        };
      });
    }

    // 過濾掉已經顯示過的餐廳
    let filteredResults = convertedResults;
    if (excludeIds && excludeIds.length > 0) {
      filteredResults = filteredResults.filter(
        (restaurant) => !excludeIds.includes(restaurant.place_id)
      );
    }

    // 如果過濾後沒有足夠的餐廳，嘗試使用備用搜尋
    if (filteredResults.length < 3) {
      return await fallbackToTextSearch(location, apiKey, excludeIds);
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

// 當附近餐廳不足時，使用更廣範圍的搜尋
async function fallbackToTextSearch(location: string, apiKey: string, excludePlaceIds: string[] = []) {
  try {
    // 使用位置參數直接在 URL 中使用，不需要分割
    
    // 嘗試使用舊版 API 進行更廣範圍的搜尋
    console.log('使用備用搜尋方法...');
    const textSearchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    textSearchUrl.searchParams.append('query', '餐廳 美食');
    textSearchUrl.searchParams.append('location', location);
    textSearchUrl.searchParams.append('radius', '5000'); // 擴大到 5 公里範圍
    textSearchUrl.searchParams.append('key', apiKey);
    textSearchUrl.searchParams.append('language', 'zh-TW');

    const response = await fetch(textSearchUrl.toString());

    if (!response.ok) {
      console.error('Google Places API 備用搜尋錯誤:', response.status);
      // 如果備用搜尋也失敗，返回一些硬編碼的餐廳數據
      return NextResponse.json({ restaurants: getHardcodedRestaurants(excludePlaceIds) });
    }

    const data = await response.json();
    console.log('備用搜尋結果:', JSON.stringify(data).substring(0, 200) + '...');
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return NextResponse.json({ restaurants: getHardcodedRestaurants(excludePlaceIds) });
    }

    // 處理舊版 API 的回應格式
    const convertedResults = data.results.map((place: {
      place_id: string;
      name: string;
      vicinity?: string;
      formatted_address?: string;
      rating?: number;
      user_ratings_total?: number;
      photos?: { photo_reference: string }[];
      geometry: {
        location: {
          lat: number;
          lng: number;
        }
      };
    }) => {
      return {
        place_id: place.place_id,
        name: place.name,
        vicinity: place.formatted_address || place.vicinity || '',
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        photos: place.photos ? place.photos.map((photo: { photo_reference: string }) => ({
          photo_reference: photo.photo_reference
        })) : undefined,
        geometry: {
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          }
        }
      };
    });

    // 過濾掉已經顯示過的餐廳
    let filteredResults = convertedResults;
    if (excludePlaceIds && excludePlaceIds.length > 0) {
      filteredResults = filteredResults.filter(
        (restaurant: { place_id: string }) => !excludePlaceIds.includes(restaurant.place_id)
      );
    }

    return NextResponse.json({ restaurants: filteredResults });
  } catch (error) {
    console.error('Text Search 請求時出錯:', error);
    
    // 返回一些硬編碼的餐廳數據
    return NextResponse.json({ restaurants: getHardcodedRestaurants(excludePlaceIds) });
  }
}

// 如果所有 API 請求都失敗，返回一些硬編碼的餐廳數據
function getHardcodedRestaurants(excludePlaceIds: string[] = []) {
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
