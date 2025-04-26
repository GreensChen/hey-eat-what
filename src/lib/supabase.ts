import { createClient } from '@supabase/supabase-js';

// 使用硬編碼的 Supabase URL 和 API Key
// 確保與 seed-supabase.js 使用相同的值
const supabaseUrl = 'https://ijnorkruiacfrnkllieb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqbm9ya3J1aWFjZnJua2xsaWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1OTc0MzUsImV4cCI6MjA2MTE3MzQzNX0.50jRqZmD6c5q7I-jYiG26JkDW2mSpOPGapQ6UVRlbFA';

// 創建 Supabase 客戶端
console.log('初始化 Supabase 客戶端，URL:', supabaseUrl);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据来源枚举
export type DataSource = 'google' | 'local';

// 餐廳表接口
export interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  vicinity?: string; // 添加 vicinity 字段，用於前端顯示地址
  rating: number;
  user_ratings_total: number;
  lat: number;
  lng: number;
  photo_url?: string;
  created_at?: string;
  source: DataSource;
  distance?: number; // 添加距離字段，用於地理位置搜索
}

// 從 Supabase 獲取餐廳數據
export async function getRestaurantFromSupabase(placeId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('place_id', placeId)
    .single();
  
  if (error || !data) {
    console.log('從 Supabase 獲取餐廳數據失敗:', error);
    return null;
  }
  
  return data as Restaurant;
}

// 從 Supabase 獲取餐廳數據（通過店名）
export async function getRestaurantByNameFromSupabase(name: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .ilike('name', `%${name}%`)
    .limit(1)
    .single();
  
  if (error || !data) {
    console.log('從 Supabase 獲取餐廳數據失敗:', error);
    return null;
  }
  
  return data as Restaurant;
}

// 將餐廳數據保存到 Supabase
export async function saveRestaurantToSupabase(restaurant: Restaurant): Promise<boolean> {
  // 檢查是否已存在
  const existing = await getRestaurantFromSupabase(restaurant.place_id);
  
  if (existing) {
    // 更新現有數據
    const { error } = await supabase
      .from('restaurants')
      .update({
        name: restaurant.name,
        address: restaurant.address,
        rating: restaurant.rating,
        user_ratings_total: restaurant.user_ratings_total,
        lat: restaurant.lat,
        lng: restaurant.lng,
        photo_url: restaurant.photo_url,
        source: restaurant.source,
        updated_at: new Date().toISOString()
      })
      .eq('place_id', restaurant.place_id);
    
    if (error) {
      console.error('更新 Supabase 餐廳數據失敗:', error);
      return false;
    }
    
    return true;
  } else {
    // 插入新數據
    const { error } = await supabase
      .from('restaurants')
      .insert({
        ...restaurant,
        created_at: new Date().toISOString(),
        source: restaurant.source || 'google' //默認為 Google 來源
      });
    
    if (error) {
      console.error('保存餐廳數據到 Supabase 失敗:', error);
      return false;
    }
    
    return true;
  }
}

// 從 Supabase 獲取隨機餐廳
export async function getRandomRestaurantsFromSupabase(count: number = 3, excludeIds: string[] = []): Promise<Restaurant[]> {
  // 首先獲取所有不在排除列表中的餐廳的 ID
  const { data: allRestaurants, error: countError } = await supabase
    .from('restaurants')
    .select('place_id')
    .not('place_id', 'in', excludeIds.length > 0 ? excludeIds : [''])
    .order('created_at', { ascending: false });
  
  if (countError || !allRestaurants || allRestaurants.length === 0) {
    console.log('從 Supabase 獲取餐廳列表失敗:', countError);
    return [];
  }
  
  // 隨機選擇餐廳
  const selectedIds: string[] = [];
  const availableIds = allRestaurants.map(r => r.place_id);
  
  // 如果可用餐廳數量少於請求數量，則返回所有可用餐廳
  if (availableIds.length <= count) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .in('place_id', availableIds);
    
    if (error || !data) {
      console.log('從 Supabase 獲取餐廳數據失敗:', error);
      return [];
    }
    
    return data as Restaurant[];
  }
  
  // 隨機選擇指定數量的餐廳
  while (selectedIds.length < count && availableIds.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableIds.length);
    const randomId = availableIds[randomIndex];
    
    if (!selectedIds.includes(randomId)) {
      selectedIds.push(randomId);
    }
    
    // 從可用 ID 列表中移除已選擇的 ID
    availableIds.splice(randomIndex, 1);
  }
  
  // 獲取選定的餐廳詳細信息
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .in('place_id', selectedIds);
  
  if (error || !data) {
    console.log('從 Supabase 獲取餐廳數據失敗:', error);
    return [];
  }
  
  return data as Restaurant[];
}

// 根據位置查詢附近的餐廳
export async function getNearbyRestaurantsFromSupabase(
  lat: number, 
  lng: number, 
  radiusInMeters: number = 2000, 
  count: number = 3, 
  excludeIds: string[] = []
): Promise<Restaurant[]> {
  try {
    // 使用 PostgreSQL 的經緯度範圍過濾
    // 這是一個簡化的實現，實際上應該使用地理位置函數計算距離
    const latRange = radiusInMeters / 111000; // 約 111km 每緯度
    const lngRange = radiusInMeters / (111000 * Math.cos(lat * Math.PI / 180)); // 根據緯度調整經度範圍
    
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .not('place_id', 'in', excludeIds.length > 0 ? excludeIds : [''])
      .gte('lat', lat - latRange)
      .lte('lat', lat + latRange)
      .gte('lng', lng - lngRange)
      .lte('lng', lng + lngRange)
      .order('created_at', { ascending: false })
      .limit(count);
    
    if (error) {
      console.error('從 Supabase 查詢附近餐廳失敗:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // 計算實際距離並過濾
    const restaurantsWithDistance = data.map(restaurant => {
      const distance = calculateDistance(lat, lng, restaurant.lat, restaurant.lng);
      return { ...restaurant, distance };
    });
    
    // 過濾出在指定範圍內的餐廳
    const filteredRestaurants = restaurantsWithDistance
      .filter(r => r.distance <= radiusInMeters)
      .sort((a, b) => a.distance - b.distance); // 按距離排序
    
    return filteredRestaurants;
  } catch (error) {
    console.error('從 Supabase 查詢附近餐廳時出錯:', error);
    return [];
  }
}

// 使用 Haversine 公式計算兩點之間的距離（單位：米）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // 地球半徑，單位：米
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
