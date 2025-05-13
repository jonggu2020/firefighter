// src/components/VWorldMap/mapConfig.js

import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
// 만약 다른 OpenLayers 모듈이 상수 정의에 필요하다면 여기에 import 추가

export const VWORLD_XYZ_URL = 'http://xdworld.vworld.kr:8080/2d/Base/201802/{z}/{x}/{y}.png?apiKey=B60B525E-129D-3B8B-880F-77C24CF86AE3';

export const logicalLayersConfig = [
    {
        name: '아산천안 토양',
        type: 'soil',
        layerNames: ['ne:Asan_Cheonan_Soil_1', 'ne:Asan_Cheonan_Soil_2', 'ne:Asan_Cheonan_Soil_3'],
        url: 'http://localhost:8080/geoserver/ne/wms',
        visible: false,
    },
    {
        name: '임상도',
        type: 'imsangdo',
        layerNames: ['ne:imsangdo_part1', 'ne:imsangdo_part2', 'ne:imsangdo_part3'],
        url: 'http://localhost:8080/geoserver/ne/wms',
        visible: false,
    },
    {
        name: '등산로',
        type: 'hiking_trail',
        fileUrls: ['/merged_hiking_trails.geojson'], // public 폴더 또는 정적 파일 서빙 경로 기준
        visible: false,
    },
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
        color: '#4a148c',
        width: 2,
        lineDash: [5, 5],
    }),
});

// hikingTrailLegend는 hikingTrailStyle에 의존하므로 함께 정의
export const hikingTrailLegend = {
    // getColor()는 Style 객체 생성 후에 호출 가능해야 함
    color: hikingTrailStyle.getStroke().getColor(),
    description: '등산로',
};

// legendContainerStyle 과 colorSwatchStyle 은 Legend 컴포넌트에서 사용하는 것이
// 더 적합해 보이므로 여기서는 제외합니다. (필요시 Legend 컴포넌트로 옮기거나 props로 전달)
