// src/components/VWorldMap/weatherService.js

const API_KEY = 'q1XWOAcb5VskyP5OQGl%2B08hLR9MyROzs%2Fav5AbVDjLpvMEbcl4qlFU%2BxSf6oxNDm2XGu0ljXk6cjUocIPX7N8Q%3D%3D';
const WEATHER_API_URL = 'http://apis.data.go.kr/1400377/mtweather/mountListSearch';

/**
 * 산악기상정보 API로부터 특정 지점, 특정 시간의 날씨 정보를 가져옵니다.
 * @param {object} params - 요청 파라미터
 * @param {string} params.obsid - 관측 지점 번호 (예: '1910')
 * @param {string} params.tm - 관측 시간 (YYYYMMDDHHMM 형식, 예: '202505131600')
 * @param {string} [params.pageNo='1'] - 페이지 번호
 * @param {string} [params.numOfRows='1'] - 한 페이지 결과 수
 * @returns {Promise<object|null>} 날씨 데이터 객체 또는 null
 */
export const fetchWeatherData = async ({
    obsid,
    tm,
    pageNo = '1',
    numOfRows = '1'
}) => {
    let queryParams = `?serviceKey=${API_KEY}`;
    queryParams += `&pageNo=${encodeURIComponent(pageNo)}`;
    queryParams += `&numOfRows=${encodeURIComponent(numOfRows)}`;
    queryParams += `&_type=${encodeURIComponent('json')}`; // JSON 요청
    queryParams += `&obsid=${encodeURIComponent(obsid)}`;
    queryParams += `&tm=${encodeURIComponent(tm)}`;

    try {
        const response = await fetch(WEATHER_API_URL + queryParams);
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                const errorHeader = errorJson?.response?.header || errorJson?.OpenAPI_ServiceResponse?.cmmMsgHeader;
                if (errorHeader) {
                    throw new Error(`API Error: ${errorHeader.returnAuthMsg || errorHeader.errMsg || 'Unknown API Error'} (Code: ${errorHeader.returnReasonCode || errorHeader.returnCode || 'N/A'})`);
                }
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            } catch (parseError) {
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
        }

        const jsonData = await response.json();

        if (jsonData?.response?.header?.resultCode === "00") {
            const items = jsonData.response.body?.items?.item;
            if (items) {
                return Array.isArray(items) ? items[0] : items;
            } else {
                console.warn("날씨 정보를 찾을 수 없음 (items 없음):", jsonData);
                return null; // 데이터는 성공적으로 받았으나 item이 없는 경우
            }
        } else {
            console.warn("API 응답 오류:", jsonData?.response?.header?.resultMsg || "알 수 없는 응답 오류");
            throw new Error(jsonData?.response?.header?.resultMsg || "알 수 없는 API 응답 오류");
        }
    } catch (error) {
        console.error("날씨 정보 가져오기 실패:", error);
        throw error; // 에러를 다시 throw하여 호출한 쪽에서 상세히 처리할 수 있도록 함
    }
};
