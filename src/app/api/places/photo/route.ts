import { NextRequest, NextResponse } from 'next/server';

// 處理獲取餐廳照片的請求
export async function GET(request: NextRequest) {
  try {
    // 從 URL 參數中獲取照片參考和寬度
    const searchParams = request.nextUrl.searchParams;
    const photoReference = searchParams.get('photo_reference');
    const maxWidth = searchParams.get('maxwidth') || '800';
    const random = searchParams.get('random'); // 用於避免快取的參數，不需要實際使用
    
    console.log(`照片請求參數: photo_reference=${photoReference}, maxwidth=${maxWidth}, random=${random}`);
    
    if (!photoReference) {
      console.error('缺少照片參考參數');
      // 返回備用照片 URL
      return new Response(
        'https://via.placeholder.com/400x300?text=缺少照片參考',
        { headers: { 'Content-Type': 'text/plain' } }
      );
    }
    
    // 獲取 Google Maps API Key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('未設置 Google Maps API Key');
      // 返回備用照片 URL
      return new Response(
        'https://via.placeholder.com/400x300?text=缺少API金鑰',
        { headers: { 'Content-Type': 'text/plain' } }
      );
    }
    
    // 建立 Google Places Photo API URL
    const photoUrl = new URL('https://maps.googleapis.com/maps/api/place/photo');
    photoUrl.searchParams.append('photoreference', photoReference);
    photoUrl.searchParams.append('maxwidth', maxWidth);
    photoUrl.searchParams.append('key', apiKey);
    
    console.log(`嘗試獲取照片: ${photoUrl.toString()}`);
    
    // 設置請求頭，模擬服務器端請求
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://hey-eat-what.vercel.app/'
    };
    
    try {
      // 使用 fetch API 發送請求
      const response = await fetch(photoUrl.toString(), { headers });
      
      console.log(`照片請求狀態: ${response.status} ${response.statusText}`);
      
      // 如果請求失敗
      if (!response.ok) {
        console.error(`照片請求失敗: ${response.status} ${response.statusText}`);
        
        // 返回備用照片 URL
        return new Response(
          'https://via.placeholder.com/400x300?text=無法獲取照片',
          { headers: { 'Content-Type': 'text/plain' } }
        );
      }
      
      // 檢查內容類型
      const contentType = response.headers.get('Content-Type');
      console.log(`回應內容類型: ${contentType}`);
      
      // 如果不是圖片類型，可能是錯誤或重定向
      if (!contentType || !contentType.startsWith('image/')) {
        console.error(`回應不是圖片: ${contentType}`);
        
        // 嘗試讀取回應內容以進行調試
        const text = await response.text();
        console.log(`回應內容: ${text.substring(0, 200)}...`);
        
        // 返回備用照片 URL
        return new Response(
          'https://via.placeholder.com/400x300?text=回應不是圖片',
          { headers: { 'Content-Type': 'text/plain' } }
        );
      }
      
      // 讀取圖片數據
      const imageBuffer = await response.arrayBuffer();
      console.log(`成功獲取照片，大小: ${imageBuffer.byteLength} 字節`);
      
      // 如果圖片大小為 0，可能是空圖片
      if (imageBuffer.byteLength === 0) {
        console.error('照片大小為 0，可能是空圖片');
        
        // 返回備用照片 URL
        return new Response(
          'https://via.placeholder.com/400x300?text=空圖片',
          { headers: { 'Content-Type': 'text/plain' } }
        );
      }
      
      // 返回圖片數據
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400', // 快取 24 小時
          'Access-Control-Allow-Origin': '*' // 允許跨域請求
        }
      });
    } catch (error) {
      console.error('照片請求發生錯誤:', error);
      
      // 返回備用照片 URL
      return new Response(
        'https://via.placeholder.com/400x300?text=請求錯誤',
        { headers: { 'Content-Type': 'text/plain' } }
      );
    }
  } catch (error) {
    console.error('處理照片請求時出錯:', error);
    
    // 返回備用照片 URL
    return new Response(
      'https://via.placeholder.com/400x300?text=處理錯誤',
      { headers: { 'Content-Type': 'text/plain' } }
    );
  }
}
