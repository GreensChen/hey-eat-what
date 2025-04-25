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
    
    // 修改以解決 API 憑證限制問題
    // 使用服務器端代理請求，避免引用限制問題
    const oldApiUrl = new URL('https://maps.googleapis.com/maps/api/place/photo');
    oldApiUrl.searchParams.append('photoreference', photoName);
    oldApiUrl.searchParams.append('maxwidth', maxWidth);
    oldApiUrl.searchParams.append('key', apiKey);
    
    // 設置請求頭，模擬服務器端請求
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Node.js) Server-Side Request',
      'Accept': 'image/jpeg, image/png, */*'
    };
    
    try {
      // 使用服務器端發送請求，不受引用限制影響
      const oldApiResponse = await fetch(oldApiUrl.toString(), { headers });
      
      if (!oldApiResponse.ok) {
        console.error(`照片請求失敗: ${oldApiResponse.status} ${oldApiResponse.statusText}`);
        return NextResponse.json(
          { error: `無法獲取照片: ${oldApiResponse.status}` },
          { status: oldApiResponse.status }
        );
      }
      
      const imageBuffer = await oldApiResponse.arrayBuffer();
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': oldApiResponse.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400' // 快取 24 小時
        }
      });
    } catch (error) {
      console.error('照片請求發生錯誤:', error);
      return NextResponse.json(
        { error: '無效的照片參考或照片不存在' },
        { status: 500 }
      );
    }
    
    // 注意: 我們已經在上面的代碼中處理了照片請求，不需要這部分代碼
    // 這部分代碼沒有被執行，因為我們已經在上面返回了響應
  } catch (error) {
    console.error('處理照片請求時出錯:', error);
    return NextResponse.json(
      { error: '處理照片請求時出錯' },
      { status: 500 }
    );
  }
}
