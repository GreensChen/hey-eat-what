import { NextResponse } from 'next/server';
import { getNearbyRestaurantsFromSupabase, saveRestaurantToSupabase, Restaurant } from '@/lib/supabase';
import { getNearbyPlaces } from '@/lib/googlePlaces';

// 模擬餐廳數據，當 API 調用失敗時使用
const mockRestaurants: Restaurant[] = [
  {
    place_id: 'mock-place-1',
    name: '好吃餐廳',
    address: '台北市信義區信義路五段7號',
    vicinity: '台北市信義區信義路五段7號',
    rating: 4.5,
    user_ratings_total: 1234,
    lat: 25.033964,
    lng: 121.564472,
    photo_url: 'https://via.placeholder.com/400x300?text=好吃餐廳',
    source: 'local'
  },
  {
    place_id: 'mock-place-2',
    name: '美味小館',
    address: '台北市大安區忠孝東路四段216巷27弄1號',
    vicinity: '台北市大安區忠孝東路四段216巷27弄1號',
    rating: 4.3,
    user_ratings_total: 567,
    lat: 25.041629,
    lng: 121.543437,
    photo_url: 'https://via.placeholder.com/400x300?text=美味小館',
    source: 'local'
  },
  {
    place_id: 'mock-place-3',
    name: '家鄉味',
    address: '台北市中山區南京東路二段115號',
    vicinity: '台北市中山區南京東路二段115號',
    rating: 4.7,
    user_ratings_total: 890,
    lat: 25.052327,
    lng: 121.533735,
    photo_url: 'https://via.placeholder.com/400x300?text=家鄉味',
    source: 'local'
  },
  {
    place_id: 'mock-place-4',
    name: '老字號飯店',
    address: '台北市中正區重慶南路一段122號',
    vicinity: '台北市中正區重慶南路一段122號',
    rating: 4.2,
    user_ratings_total: 345,
    lat: 25.037,
    lng: 121.513,
    photo_url: 'https://via.placeholder.com/400x300?text=老字號飯店',
    source: 'local'
  },
  {
    place_id: 'mock-place-5',
    name: '創意料理',
    address: '台北市松山區南京東路五段123號',
    vicinity: '台北市松山區南京東路五段123號',
    rating: 4.6,
    user_ratings_total: 678,
    lat: 25.051,
    lng: 121.557,
    photo_url: 'https://via.placeholder.com/400x300?text=創意料理',
    source: 'local'
  }
];

export async function GET(request: Request) {
  try {
    // 從 URL 參數中獲取位置信息和排除的餐廳 ID
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const excludeIdsParam = searchParams.get('excludeIds');
    const countParam = searchParams.get('count') || '3';
    
    // 解析參數
    // 默認位置為台中國家歌劇院
    const defaultLat = 24.1631; // 台中國家歌劇院緯度
    const defaultLng = 120.6412; // 台中國家歌劇院經度
    const lat = latParam ? parseFloat(latParam) : defaultLat;
    const lng = lngParam ? parseFloat(lngParam) : defaultLng;
    const totalCount = parseInt(countParam, 10);
    const excludeIds = excludeIdsParam ? JSON.parse(excludeIdsParam) : [];
    
    // 檢查是否使用模擬數據
    const useMockData = process.env.USE_MOCK_DATA === 'true';
    
    if (useMockData) {
      console.log('使用模擬數據模式');
      // 從模擬數據中過濾出未顯示過的餐廳
      const excludeIdSet = new Set(excludeIds);
      const availableRestaurants = mockRestaurants.filter(r => !excludeIdSet.has(r.place_id));
      
      // 如果所有模擬餐廳都已經顯示過，則重置
      if (availableRestaurants.length === 0) {
        return NextResponse.json({ restaurants: mockRestaurants.slice(0, totalCount) });
      }
      
      // 隨機選擇指定數量的餐廳
      const shuffled = [...availableRestaurants].sort(() => 0.5 - Math.random());
      return NextResponse.json({ restaurants: shuffled.slice(0, totalCount) });
    }
    
    // 步驟 1: 從 Supabase 獲取附近的餐廳（2 公里範圍）
    console.log(`從 Supabase 查詢附近餐廳 (${lat}, ${lng})，半徑 2 公里`);
    
    // 計算從 Supabase 中需要獲取的餐廳數量
    // 保留至少 1 個位置給新餐廳
    const supabaseCount = Math.max(0, totalCount - 1);
    
    let supabaseRestaurants = await getNearbyRestaurantsFromSupabase(lat, lng, 2000, supabaseCount, excludeIds);
    
    // 即使 Supabase 中有足夠的餐廳，也有 20% 的機會使用 Google API 查詢新餐廳
    const shouldExplore = Math.random() < 0.2; // 20% 的探索率
    
    if (supabaseRestaurants.length >= supabaseCount && !shouldExplore) {
      // 有足夠的餐廳且不需要探索，直接返回 Supabase 結果
      // 將 address 映射到 vicinity 字段，以符合前端預期
      const mappedRestaurants = supabaseRestaurants.map(restaurant => ({
        ...restaurant,
        vicinity: restaurant.address
      }));
      
      return NextResponse.json({ 
        restaurants: mappedRestaurants,
        source: 'supabase'
      });
    }
    
    // 如果 2 公里範圍內的餐廳不足，擴大到 3 公里範圍
    if (supabaseRestaurants.length < supabaseCount) {
      console.log('2 公里範圍內的餐廳不足，擴大到 3 公里範圍');
      supabaseRestaurants = await getNearbyRestaurantsFromSupabase(lat, lng, 3000, supabaseCount, excludeIds);
    }
    
    // 獲取 API Key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // 步驟 2: 從 Google Places API 獲取至少 1 間新餐廳
    console.log('從 Google Places API 獲取新餐廳');
    
    // 計算需要從 Google API 獲取的餐廳數量
    const googleCount = Math.max(1, totalCount - supabaseRestaurants.length);
    
    if (!apiKey) {
      console.error('未設置 Google Maps API Key');
      
      // 如果沒有 API Key，使用模擬數據
      const excludeIdSet = new Set([...excludeIds, ...supabaseRestaurants.map(r => r.place_id)]);
      const availableMockRestaurants = mockRestaurants.filter(r => !excludeIdSet.has(r.place_id));
      const shuffled = [...availableMockRestaurants].sort(() => 0.5 - Math.random());
      const selectedMockRestaurants = shuffled.slice(0, googleCount);
      
      // 將 address 映射到 vicinity 字段
      const mappedSupabaseRestaurants = supabaseRestaurants.map(restaurant => ({
        ...restaurant,
        vicinity: restaurant.address
      }));
      
      const mappedMockRestaurants = selectedMockRestaurants.map(restaurant => ({
        ...restaurant,
        vicinity: restaurant.address
      }));
      
      return NextResponse.json({ 
        restaurants: [...mappedSupabaseRestaurants, ...mappedMockRestaurants],
        source: 'mixed'
      });
    }
    
    // 從 Google Places API 獲取餐廳
    const allExcludeIds = [...excludeIds, ...supabaseRestaurants.map(r => r.place_id)];
    let googleRestaurants = await getNearbyPlaces(lat, lng, 2000, allExcludeIds);
    
    // 如果 2 公里範圍內的 Google 餐廳不足，擴大到 3 公里範圍
    if (googleRestaurants.length < googleCount) {
      console.log('Google API 2 公里範圍內的餐廳不足，擴大到 3 公里範圍');
      googleRestaurants = await getNearbyPlaces(lat, lng, 3000, allExcludeIds);
    }
    
    // 步驟 3: 將新獲取的餐廳保存到 Supabase
    for (const restaurant of googleRestaurants) {
      // 非同步保存，不等待結果
      saveRestaurantToSupabase(restaurant).catch(err => {
        console.error('保存餐廳到 Supabase 失敗:', err);
      });
    }
    
    // 如果 Google API 沒有返回新餐廳，則全部使用 Supabase 數據
    if (googleRestaurants.length === 0) {
      console.log('Google API 沒有返回新餐廳，全部使用 Supabase 數據');
      
      // 重新查詢 Supabase，獲取更多餐廳
      const allSupabaseRestaurants = await getNearbyRestaurantsFromSupabase(lat, lng, 3000, totalCount, excludeIds);
      
      // 將 address 映射到 vicinity 字段
      const mappedRestaurants = allSupabaseRestaurants.map(restaurant => ({
        ...restaurant,
        vicinity: restaurant.address
      }));
      
      return NextResponse.json({ 
        restaurants: mappedRestaurants,
        source: 'supabase'
      });
    }
    
    // 步驟 4: 合併結果，確保至少有 1 間新餐廳
    // 確保所有餐廳都有 vicinity 字段
    const processedSupabaseRestaurants = supabaseRestaurants.map(restaurant => ({
      ...restaurant,
      vicinity: restaurant.address // 確保始終使用 address 作為 vicinity
    }));
    
    const processedGoogleRestaurants = googleRestaurants.map(restaurant => ({
      ...restaurant,
      vicinity: restaurant.address // 確保始終使用 address 作為 vicinity
    }));
    
    const combinedRestaurants = [
      ...processedSupabaseRestaurants,
      ...processedGoogleRestaurants.slice(0, googleCount)
    ];
    
    // 如果合併後的餐廳數量仍然不足，使用更多 Supabase 數據補充
    if (combinedRestaurants.length < totalCount) {
      console.log('合併後的餐廳數量不足，使用更多 Supabase 數據補充');
      
      // 獲取更多 Supabase 餐廳，排除已選擇的餐廳
      const additionalExcludeIds = [
        ...excludeIds,
        ...combinedRestaurants.map(r => r.place_id)
      ];
      
      const additionalRestaurants = await getNearbyRestaurantsFromSupabase(
        lat, 
        lng, 
        3000, // 使用 3 公里範圍
        totalCount - combinedRestaurants.length,
        additionalExcludeIds
      );
      
      // 確保額外的 Supabase 餐廳也有 vicinity 字段
      const processedAdditionalRestaurants = additionalRestaurants.map(restaurant => ({
        ...restaurant,
        vicinity: restaurant.address
      }));
      
      combinedRestaurants.push(...processedAdditionalRestaurants);
    }
    
    // 如果仍然不足，使用模擬數據補充
    if (combinedRestaurants.length < totalCount) {
      console.log('餐廳數量仍然不足，使用模擬數據補充');
      
      const allExcludeIds = new Set([
        ...excludeIds, 
        ...combinedRestaurants.map(r => r.place_id)
      ]);
      
      const availableMockRestaurants = mockRestaurants.filter(r => !allExcludeIds.has(r.place_id));
      const shuffled = [...availableMockRestaurants].sort(() => 0.5 - Math.random());
      const selectedMockRestaurants = shuffled.slice(0, totalCount - combinedRestaurants.length);
      
      // 確保模擬餐廳也有 vicinity 字段
      const processedMockRestaurants = selectedMockRestaurants.map(restaurant => ({
        ...restaurant,
        vicinity: restaurant.address
      }));
      
      combinedRestaurants.push(...processedMockRestaurants);
    }
    
    // 將所有餐廳的 address 映射到 vicinity 字段
    const mappedRestaurants = combinedRestaurants.map(restaurant => ({
      ...restaurant,
      vicinity: restaurant.address
    }));
    
    return NextResponse.json({ 
      restaurants: mappedRestaurants,
      source: 'mixed'
    });
  } catch (error) {
    console.error('獲取餐廳時出錯:', error);
    
    // 發生錯誤時返回模擬數據
    const countParam = new URL(request.url).searchParams.get('count') || '3';
    const count = parseInt(countParam, 10);
    // 將模擬數據的 address 映射到 vicinity 字段
    const mappedMockRestaurants = mockRestaurants.slice(0, count).map(restaurant => ({
      ...restaurant,
      vicinity: restaurant.address
    }));
    
    return NextResponse.json({ 
      restaurants: mappedMockRestaurants,
      source: 'mock',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
