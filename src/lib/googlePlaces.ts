import { Restaurant } from './supabase';

// 使用 Find Place From Text API 查詢餐廳
export async function findPlaceFromText(query: string): Promise<string | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API Key 未設置');
      return null;
    }
    
    const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
    url.searchParams.append('input', query);
    url.searchParams.append('inputtype', 'textquery');
    url.searchParams.append('fields', 'place_id');
    url.searchParams.append('language', 'zh-TW');
    url.searchParams.append('key', apiKey);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Google Places API 請求失敗: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.candidates || data.candidates.length === 0) {
      console.log('未找到匹配的地點:', query);
      return null;
    }
    
    return data.candidates[0].place_id;
  } catch (error) {
    console.error('Find Place From Text API 調用失敗:', error);
    return null;
  }
}

// 使用 Place Details API 獲取餐廳詳細信息
export async function getPlaceDetails(placeId: string): Promise<Restaurant | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API Key 未設置');
      return null;
    }
    
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('fields', 'name,formatted_address,rating,user_ratings_total,geometry,photos');
    url.searchParams.append('language', 'zh-TW');
    url.searchParams.append('key', apiKey);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Google Places API 請求失敗: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.result) {
      console.log('未找到地點詳細信息:', placeId);
      return null;
    }
    
    const result = data.result;
    let photoUrl: string | undefined = undefined;
    
    if (result.photos && result.photos.length > 0) {
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${result.photos[0].photo_reference}&key=${apiKey}`;
    }
    
    return {
      place_id: placeId,
      name: result.name,
      address: result.formatted_address,
      rating: result.rating || 0,
      user_ratings_total: result.user_ratings_total || 0,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      photo_url: photoUrl,
      source: 'google' as const // 指定数据来源为 Google
    };
  } catch (error) {
    console.error('Place Details API 調用失敗:', error);
    return null;
  }
}

// 生成隨機餐廳關鍵詞
export function generateRandomRestaurantKeywords(count: number = 3): string[] {
  const foodTypes = [
    '日式料理', '韓式料理', '中式料理', '台式料理', '義式料理', 
    '法式料理', '美式料理', '泰式料理', '越式料理', '印度料理',
    '墨西哥料理', '素食料理', '海鮮料理', '燒烤', '火鍋',
    '牛排', '咖啡廳', '甜點', '早午餐', '小吃',
    '麵食', '壽司', '拉麵', '披薩', '漢堡',
    '炸雞', '便當', '滷味', '餃子', '粥品'
  ];
  
  const restaurants = [
    '餐廳', '餐館', '食堂', '小館', '料理店',
    '食店', '美食', '飯店', '小吃店', '夜市攤'
  ];
  
  const locations = [
    '台北', '信義區', '大安區', '中山區', '松山區',
    '內湖區', '士林區', '北投區', '文山區', '南港區',
    '中正區', '萬華區', '新北', '板橋', '新莊',
    '三重', '中和', '永和', '土城', '樹林',
    '淡水', '汐止', '桃園', '中壢', '平鎮'
  ];
  
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomFoodType = foodTypes[Math.floor(Math.random() * foodTypes.length)];
    const randomRestaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    
    // 隨機組合關鍵詞
    const randomCombination = Math.floor(Math.random() * 3);
    
    let keyword = '';
    switch (randomCombination) {
      case 0:
        keyword = `${randomLocation}${randomFoodType}`;
        break;
      case 1:
        keyword = `${randomFoodType}${randomRestaurant}`;
        break;
      case 2:
        keyword = `${randomLocation}${randomRestaurant}`;
        break;
    }
    
    result.push(keyword);
  }
  
  return result;
}

// 使用 Nearby Search API 獲取附近的餐廳
export async function getNearbyPlaces(
  lat: number, 
  lng: number, 
  radius: number = 2000, 
  excludePlaceIds: string[] = []
): Promise<Restaurant[]> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API Key 未設置');
      return [];
    }
    
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.append('location', `${lat},${lng}`);
    url.searchParams.append('radius', radius.toString());
    url.searchParams.append('type', 'restaurant');
    url.searchParams.append('language', 'zh-TW');
    url.searchParams.append('key', apiKey);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Google Places API 請求失敗: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log('未找到附近的餐廳');
      return [];
    }
    
    // 過濾掉已經排除的餐廳
    const excludeSet = new Set(excludePlaceIds);
    const filteredResults = data.results.filter(place => !excludeSet.has(place.place_id));
    
    // 將 Google Places API 結果轉換為應用程序的 Restaurant 格式
    const restaurants: Restaurant[] = filteredResults.map(place => {
      let photoUrl: string | undefined = undefined;
      
      if (place.photos && place.photos.length > 0) {
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`;
      }
      
      return {
        place_id: place.place_id,
        name: place.name,
        address: place.vicinity,
        rating: place.rating || 0,
        user_ratings_total: place.user_ratings_total || 0,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        photo_url: photoUrl,
        source: 'google' as const
      };
    });
    
    return restaurants;
  } catch (error) {
    console.error('Nearby Search API 調用失敗:', error);
    return [];
  }
}
