// 將模擬數據導入 Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 直接使用提供的 Supabase 憑證
const supabaseUrl = 'https://ijnorkruiacfrnkllieb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqbm9ya3J1aWFjZnJua2xsaWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1OTc0MzUsImV4cCI6MjA2MTE3MzQzNX0.50jRqZmD6c5q7I-jYiG26JkDW2mSpOPGapQ6UVRlbFA';

// 創建 Supabase 客戶端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 模擬餐廳數據
const mockRestaurants = [
  {
    place_id: 'mock-place-1',
    name: '鴨泰豐 (信義店)',
    address: '台北市信義區松高路11號',
    rating: 4.7,
    user_ratings_total: 1245,
    photo_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=160&fit=crop&auto=format',
    lat: 25.0393,
    lng: 121.5677,
    source: 'local'
  },
  {
    place_id: 'mock-place-2',
    name: '添好運點心專門店',
    address: '台北市信義區松壽路12號',
    rating: 4.5,
    user_ratings_total: 987,
    photo_url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=160&fit=crop&auto=format',
    lat: 25.0359,
    lng: 121.5672,
    source: 'local'
  },
  {
    place_id: 'mock-place-3',
    name: '肉多多火鍋 (台北京站店)',
    address: '台北市大同區承德路一段1號',
    rating: 4.3,
    user_ratings_total: 723,
    photo_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=160&fit=crop&auto=format',
    lat: 25.0477,
    lng: 121.5177,
    source: 'local'
  },
  {
    place_id: 'mock-place-4',
    name: '金鋒滑肉飯',
    address: '台北市大安區師大路49巷5號',
    rating: 4.4,
    user_ratings_total: 512,
    photo_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=160&fit=crop&auto=format',
    lat: 25.0246,
    lng: 121.5286,
    source: 'local'
  },
  {
    place_id: 'mock-place-5',
    name: '高記茶餐廳',
    address: '台北市大安區延吉街131巷1號',
    rating: 4.2,
    user_ratings_total: 654,
    photo_url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=160&fit=crop&auto=format',
    lat: 25.0267,
    lng: 121.5329,
    source: 'local'
  }
];

// 將模擬數據導入 Supabase
async function seedSupabase() {
  console.log('開始導入模擬數據到 Supabase...');
  
  // 檢查 restaurants 表是否存在
  try {
    console.log('檢查 restaurants 表...');
    const { error: tableError } = await supabase
      .from('restaurants')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.error('表可能不存在:', tableError.message);
      console.log('請確保您已在 Supabase 控制台中創建了 restaurants 表。');
      return;
    }
    
    console.log('restaurants 表存在，繼續導入數據...');
  } catch (error) {
    console.error('檢查表時出錯:', error.message);
    return;
  }
  
  // 導入模擬數據
  for (const restaurant of mockRestaurants) {
    const { error } = await supabase
      .from('restaurants')
      .upsert({
        ...restaurant,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error(`導入餐廳 ${restaurant.name} 失敗:`, error.message);
    } else {
      console.log(`成功導入餐廳: ${restaurant.name}`);
    }
  }
  
  console.log('模擬數據導入完成！');
}

// 執行導入
seedSupabase()
  .catch(error => {
    console.error('導入過程中出錯:', error);
  });
