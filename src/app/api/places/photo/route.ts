import { NextRequest, NextResponse } from 'next/server';

// 處理獲取餐廳照片的請求
export async function GET(request: NextRequest) {
  try {
    // 從 URL 參數中獲取照片名稱
    const searchParams = request.nextUrl.searchParams;
    const photoName = searchParams.get('photo_reference');
    const maxWidth = searchParams.get('maxwidth') || '800';
    const maxHeight = searchParams.get('maxheight') || '800';
    
    if (!photoName) {
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
    
    // 使用新版 Google Places Photos API 的 URL
    // 參考文檔: https://developers.google.com/maps/documentation/places/web-service/photos?hl=zh-tw
    // 格式: https://places.googleapis.com/v1/NAME/media?maxHeightPx=800&maxWidthPx=800&key=API_KEY
    
    // 檢查是否是完整的照片路徑
    let photoUrl: string;
    if (photoName.startsWith('places/')) {
      // 如果已經是完整的路徑，直接使用
      photoUrl = `https://places.googleapis.com/v1/${photoName}/media`;
    } else {
      // 如果是舊版的 photo_reference，嘗試使用舊版 API
      const oldApiUrl = new URL('https://maps.googleapis.com/maps/api/place/photo');
      oldApiUrl.searchParams.append('photoreference', photoName);
      oldApiUrl.searchParams.append('maxwidth', maxWidth);
      oldApiUrl.searchParams.append('key', apiKey);
      
      const oldApiResponse = await fetch(oldApiUrl.toString());
      if (oldApiResponse.ok) {
        const imageBuffer = await oldApiResponse.arrayBuffer();
        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': oldApiResponse.headers.get('Content-Type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400' // 快取 24 小時
          }
        });
      }
      
      // 如果舊版 API 失敗，返回錯誤
      return NextResponse.json(
        { error: '無效的照片參考或照片不存在' },
        { status: 404 }
      );
    }
    
    // 添加查詢參數
    const url = new URL(photoUrl);
    url.searchParams.append('maxWidthPx', maxWidth);
    url.searchParams.append('maxHeightPx', maxHeight);
    url.searchParams.append('key', apiKey);
    
    // 發送請求到新版 Google Places Photos API
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
