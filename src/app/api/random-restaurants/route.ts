import { NextResponse } from 'next/server';
import { 
  getRandomRestaurantsFromSupabase, 
  saveRestaurantToSupabase, 
  getRestaurantFromSupabase,
  getRestaurantByNameFromSupabase
} from '@/lib/supabase';
import { 
  findPlaceFromText, 
  getPlaceDetails, 
  generateRandomRestaurantKeywords 
} from '@/lib/googlePlaces';

// 從模擬數據中獲取餐廳
import { mockRestaurants } from '@/data/mockRestaurants';

export async function GET(request: Request) {
  try {
    // 獲取請求參數
    const { searchParams } = new URL(request.url);
    const excludeIdsParam = searchParams.get('excludeIds');
    const countParam = searchParams.get('count') || '3';
    const count = parseInt(countParam, 10);
    
    // 解析排除的餐廳 ID
    const excludeIds = excludeIdsParam ? JSON.parse(excludeIdsParam) : [];
    
    // 檢查是否使用模擬數據
    // 如果環境變量 USE_MOCK_DATA 為 true，則使用模擬數據
    // 我們已經在 supabase.ts 中使用了硬編碼的 Supabase URL 和 API Key，所以不需要檢查環境變量
    const useMockData = process.env.USE_MOCK_DATA === 'true';
    
    if (useMockData) {
      console.log('使用模擬數據模式');
      // 從模擬數據中隨機選擇餐廳
      const excludeIdSet = new Set(excludeIds);
      const availableRestaurants = mockRestaurants.filter(r => !excludeIdSet.has(r.place_id));
      
      // 如果所有模擬餐廳都已經顯示過，則重置
      if (availableRestaurants.length === 0) {
        // 將模擬數據轉換為前端需要的格式，確保 address 映射到 vicinity
        const formattedRestaurants = mockRestaurants.slice(0, count).map(restaurant => ({
          ...restaurant,
          vicinity: restaurant.address // 添加 vicinity 字段，使用 address 的值
        }));
        return NextResponse.json({ restaurants: formattedRestaurants });
      }
      
      // 隨機選擇指定數量的餐廳
      const shuffled = [...availableRestaurants].sort(() => 0.5 - Math.random());
      const selectedRestaurants = shuffled.slice(0, count);
      
      // 將模擬數據轉換為前端需要的格式，確保 address 映射到 vicinity
      const formattedRestaurants = selectedRestaurants.map(restaurant => ({
        ...restaurant,
        vicinity: restaurant.address // 添加 vicinity 字段，使用 address 的值
      }));
      
      return NextResponse.json({ restaurants: formattedRestaurants });
    }
    
    // 嘗試從 Supabase 獲取隨機餐廳
    let supabaseRestaurants = [];
    try {
      supabaseRestaurants = await getRandomRestaurantsFromSupabase(count, excludeIds);
    } catch (error) {
      console.error('從 Supabase 獲取餐廳失敗，將使用模擬數據:', error);
      // 如果 Supabase 查詢失敗，使用模擬數據
      const excludeIdSet = new Set(excludeIds);
      const availableRestaurants = mockRestaurants.filter(r => !excludeIdSet.has(r.place_id));
      const shuffled = [...availableRestaurants].sort(() => 0.5 - Math.random());
      return NextResponse.json({ restaurants: shuffled.slice(0, count) });
    }
    
    // 如果 Supabase 中有足夠的餐廳，直接返回
    if (supabaseRestaurants.length >= count) {
      console.log('從 Supabase 獲取餐廳成功');
      
      // 將 Supabase 餐廳數據轉換為前端需要的格式
      const restaurants = supabaseRestaurants.map(restaurant => ({
        place_id: restaurant.place_id,
        name: restaurant.name,
        vicinity: restaurant.address,
        rating: restaurant.rating,
        user_ratings_total: restaurant.user_ratings_total,
        geometry: {
          location: {
            lat: restaurant.lat,
            lng: restaurant.lng
          }
        },
        photos: restaurant.photo_url ? [{ photo_reference: restaurant.photo_url }] : [],
        source: restaurant.source // 添加数据来源字段
      }));
      
      return NextResponse.json({ restaurants });
    }
    
    // 如果 Supabase 中的餐廳不足，則生成隨機關鍵詞並查詢 Google API
    console.log('Supabase 中的餐廳不足，使用 Google API');
    
    // 生成隨機餐廳關鍵詞
    const remainingCount = count - supabaseRestaurants.length;
    const keywords = generateRandomRestaurantKeywords(remainingCount);
    
    // 查詢 Google API 獲取餐廳數據
    const googleRestaurants = [];
    
    for (const keyword of keywords) {
      // 首先嘗試通過關鍵詞從 Supabase 查詢
      const existingRestaurant = await getRestaurantByNameFromSupabase(keyword);
      
      if (existingRestaurant) {
        // 如果 Supabase 中已經有匹配的餐廳，直接使用
        googleRestaurants.push({
          place_id: existingRestaurant.place_id,
          name: existingRestaurant.name,
          vicinity: existingRestaurant.address,
          rating: existingRestaurant.rating,
          user_ratings_total: existingRestaurant.user_ratings_total,
          geometry: {
            location: {
              lat: existingRestaurant.lat,
              lng: existingRestaurant.lng
            }
          },
          photos: existingRestaurant.photo_url ? [{ photo_reference: existingRestaurant.photo_url }] : [],
          source: existingRestaurant.source // 添加数据来源字段
        });
        continue;
      }
      
      // 使用 Find Place From Text API 查詢餐廳
      const placeId = await findPlaceFromText(keyword);
      
      if (!placeId) {
        console.log(`未找到匹配的餐廳: ${keyword}`);
        continue;
      }
      
      // 檢查是否已經在 Supabase 中存在
      const existingPlace = await getRestaurantFromSupabase(placeId);
      
      if (existingPlace) {
        // 如果 Supabase 中已經有該餐廳，直接使用
        googleRestaurants.push({
          place_id: existingPlace.place_id,
          name: existingPlace.name,
          vicinity: existingPlace.address,
          rating: existingPlace.rating,
          user_ratings_total: existingPlace.user_ratings_total,
          geometry: {
            location: {
              lat: existingPlace.lat,
              lng: existingPlace.lng
            }
          },
          photos: existingPlace.photo_url ? [{ photo_reference: existingPlace.photo_url }] : [],
          source: existingPlace.source // 添加数据来源字段
        });
        continue;
      }
      
      // 使用 Place Details API 獲取餐廳詳細信息
      const placeDetails = await getPlaceDetails(placeId);
      
      if (!placeDetails) {
        console.log(`未找到餐廳詳細信息: ${placeId}`);
        continue;
      }
      
      // 將餐廳數據保存到 Supabase
      await saveRestaurantToSupabase(placeDetails);
      
      // 將餐廳數據添加到結果中
      // 確保添加 vicinity 字段，使用 address 的值
      googleRestaurants.push({
        ...placeDetails,
        vicinity: placeDetails.address // 添加 vicinity 字段，使用 address 的值
      });
      
      // 如果已經獲取了足夠的餐廳，則停止查詢
      if (googleRestaurants.length >= remainingCount) {
        break;
      }
    }
    
    // 合併 Supabase 和 Google API 獲取的餐廳
    const allRestaurants = [
      ...supabaseRestaurants,
      ...googleRestaurants
    ];
    
    // 如果獲取的餐廳數量不足，則使用模擬數據補充
    if (allRestaurants.length < count) {
      console.log('獲取的餐廳數量不足，使用模擬數據補充');
      
      const excludeIdSet = new Set([...excludeIds, ...allRestaurants.map(r => r.place_id)]);
      const availableMockRestaurants = mockRestaurants.filter(r => !excludeIdSet.has(r.place_id));
      
      // 隨機選擇模擬餐廳
      const remainingCount = count - allRestaurants.length;
      const shuffled = [...availableMockRestaurants].sort(() => 0.5 - Math.random());
      const selectedMockRestaurants = shuffled.slice(0, remainingCount);
      
      // 合併結果
      allRestaurants.push(...selectedMockRestaurants);
    }
    
    return NextResponse.json({ restaurants: allRestaurants });
  } catch (error) {
    console.error('獲取隨機餐廳時出錯:', error);
    
    // 改進錯誤處理，提供更詳細的錯誤信息
    let errorMessage = '獲取餐廳數據失敗';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else {
      errorDetails = { rawError: String(error) };
    }
    
    // 檢查環境變數配置
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase 環境變數未配置，將使用模擬數據');
      
      // 如果沒有配置 Supabase，則使用模擬數據
      const countParam = new URL(request.url).searchParams.get('count') || '3';
      const countValue = parseInt(countParam, 10);
      return NextResponse.json({ restaurants: mockRestaurants.slice(0, countValue) });
    }
    
    // 檢查 Supabase URL 是否為預設值
    if (process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') || 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder')) {
      console.warn('使用預設的 Supabase URL 或 Key，將使用模擬數據');
      const countParam = new URL(request.url).searchParams.get('count') || '3';
      const countValue = parseInt(countParam, 10);
      return NextResponse.json({ restaurants: mockRestaurants.slice(0, countValue) });
    }
    
    return NextResponse.json({ 
      error: errorMessage, 
      details: errorDetails,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing'
    }, { status: 500 });
  }
}
