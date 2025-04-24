import { NextRequest, NextResponse } from 'next/server';

// 處理獲取餐廳照片的請求
export async function GET(request: NextRequest) {
  try {
    // 從 URL 參數中獲取照片引用
    const searchParams = request.nextUrl.searchParams;
    const photoReference = searchParams.get('photo_reference');
    const maxWidth = searchParams.get('maxwidth') || '400';
    
    if (!photoReference) {
      return NextResponse.json(
        { error: '缺少必要的 photo_reference 參數' },
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
    
    // 構建 Google Places Photos API 的 URL
    const url = new URL('https://maps.googleapis.com/maps/api/place/photo');
    url.searchParams.append('photoreference', photoReference);
    url.searchParams.append('maxwidth', maxWidth);
    url.searchParams.append('key', apiKey);
    
    // 發送請求到 Google Places Photos API
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `獲取照片失敗: ${response.status}` },
        { status: response.status }
      );
    }
    
    // 獲取照片的二進制數據
    const imageBuffer = await response.arrayBuffer();
    
    // 創建一個新的 Response 對象，包含照片數據和正確的 Content-Type
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400' // 快取 24 小時
      }
    });
  } catch (error) {
    console.error('處理照片請求時出錯:', error);
    return NextResponse.json(
      { error: '處理照片請求時出錯' },
      { status: 500 }
    );
  }
}
