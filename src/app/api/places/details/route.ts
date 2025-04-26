import { NextResponse } from 'next/server';

// 處理獲取餐廳詳細資訊的請求
export async function GET(request: Request) {
  try {
    // 從 URL 參數中獲取餐廳 ID
    const url = new URL(request.url);
    const placeId = url.searchParams.get('placeId');
    
    if (!placeId) {
      return NextResponse.json(
        { error: '未提供餐廳 ID' },
        { status: 400 }
      );
    }
    
    // 檢查是否設置了使用模擬數據的環境變量
    const useMockData = process.env.USE_MOCK_DATA === 'true' || !process.env.GOOGLE_MAPS_API_KEY;
    
    if (useMockData) {
      console.log('使用模擬數據代替 Enterprise Places API');
      
      // 返回模擬的餐廳詳細資訊
      return NextResponse.json({
        details: {
          business_status: 'OPERATIONAL',
          opening_hours: {
            open_now: true,
            weekday_text: [
              '星期一: 11:00 – 21:30',
              '星期二: 11:00 – 21:30',
              '星期三: 11:00 – 21:30',
              '星期四: 11:00 – 21:30',
              '星期五: 11:00 – 22:00',
              '星期六: 10:00 – 22:00',
              '星期日: 10:00 – 21:30'
            ]
          }
        }
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
    
    // 使用 Google Places API 獲取餐廳詳細資訊
    // 只請求基本欄位，不請求 Enterprise Places - Contact Data API 的欄位
    const fields = [
      'place_id',
      'name',
      'vicinity',
      'formatted_address',
      'rating',
      'user_ratings_total',
      'photos',
      'geometry',
      'business_status',
      'opening_hours',
      'price_level',
      'types',
      'plus_code'
    ].join(',');
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`獲取餐廳詳細資訊失敗: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`餐廳 ${placeId} 的詳細資訊:`, JSON.stringify(data.result).substring(0, 200));
    
    if (data.status !== 'OK' || !data.result) {
      return NextResponse.json(
        { error: '無法獲取餐廳詳細資訊' },
        { status: 404 }
      );
    }
    
    // 返回餐廳詳細資訊
    return NextResponse.json({ details: data.result });
  } catch (error) {
    console.error('獲取餐廳詳細資訊時出錯:', error);
    return NextResponse.json(
      { error: '獲取餐廳詳細資訊時出錯' },
      { status: 500 }
    );
  }
}
