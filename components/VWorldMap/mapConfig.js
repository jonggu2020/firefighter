// src/components/VWorldMap/mapConfig.js

import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
// 필요한 OpenLayers 모듈이 있다면 여기에 추가 import

export const VWORLD_XYZ_URL = 'http://xdworld.vworld.kr:8080/2d/Base/201802/{z}/{x}/{y}.png?apiKey=B60B525E-129D-3B8B-880F-77C24CF86AE3';

export const logicalLayersConfig = [
    {
        name: '아산천안 토양', // 예시 레이어, 실제 프로젝트에 맞게 수정
        type: 'soil',
        layerNames: ['ne:Asan_Cheonan_Soil_1', 'ne:Asan_Cheonan_Soil_2', 'ne:Asan_Cheonan_Soil_3'], // 실제 GeoServer 레이어 이름
        url: 'http://localhost:8080/geoserver/ne/wms', // GeoServer 주소
        visible: false, // 초기 가시성
    },
    {
        name: '임상도', // 예시 레이어
        type: 'imsangdo',
        layerNames: ['ne:imsangdo_part1', 'ne:imsangdo_part2', 'ne:imsangdo_part3'], // 실제 GeoServer 레이어 이름
        url: 'http://localhost:8080/geoserver/ne/wms',
        visible: false,
    },
    {
        name: '등산로', // 예시 레이어
        type: 'hiking_trail',
        fileUrls: ['/merged_hiking_trails.geojson'], // public 폴더 기준 또는 접근 가능한 URL
        visible: false,
    },
    // --- 산악기상관측소 마커 레이어 설정 추가 ---
    {
        name: '산악기상관측소 마커', // LayerControlPanel에 표시될 이름
        type: 'mountain_station_markers', // 이 레이어를 식별하기 위한 고유 타입
        visible: true, // 마커의 초기 표시 여부 (true로 설정하면 처음부터 보임)
    }
];

export const soilColorMap = {
    '01': '#c8824c', '02': '#c8ab4f', '03': '#c6c9b7', '05': '#efc27e',
    '06': '#19ee12', '28': '#7182d9', '82': '#d2533f', '91': '#62e0d6',
    '93': '#8ce7b5', '94': '#de386f', '95': '#80ee19', '99': '#128cd2',
};

export const soilCodeDescriptions = {
    '01': '갈색건조림토양(1)', '02': '갈색산림토양(2)', '03': '갈색산림토양(3)', '05': '암갈색산림토양',
    '06': '매우깊은갈색산림토양', '28': '식양질논토양', '82': '사질밭토양', '91': '회색토',
    '93': '신흥이탄토양', '94': '경작지', '95': '특이토양', '99': '하천부지',
};

export const imsangdoColorMap = {
    '0': '#e0447a', '1': '#56d014', '2': '#b370d7', '3': '#34ca96', '4': '#4e7bcf',
};

export const imsangdoCodeDescriptions = {
    '0': '무립목지 / 비산림', '1': '침엽수림', '2': '활엽수림', '3': '혼효림', '4': '죽림',
};

export const hikingTrailStyle = new Style({
    stroke: new Stroke({
        color: '#4a148c', // 등산로 색상 예시
        width: 2,
        lineDash: [5, 5], // 점선 스타일 예시
    }),
});

export const hikingTrailLegend = {
    color: hikingTrailStyle.getStroke().getColor(), // 스타일에서 색상 가져오기
    description: '등산로',
};

// (선택 사항) 마커 범례 정보 추가
export const mountainMarkerLegendInfo = {
    description: '산악기상관측소 위치',
    // 마커 스타일 정보를 여기에 추가하여 Legend.js에서 일관되게 사용할 수 있습니다.
    // 예: style: { fill: 'rgba(0, 128, 0, 0.8)', stroke: 'white', radius: 7 }
};
