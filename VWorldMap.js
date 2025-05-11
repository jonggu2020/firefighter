// 이 파일은 OpenLayers 라이브러리를 사용하여 지도를 생성하고 GeoServer에서 서비스하는 WMS 데이터를 표시합니다.
// GeoServer WMS 레이어를 불러와 서버 측에서 정의된 스타일로 데이터를 표시합니다.
// 추가로 적은 양의 벡터 데이터(예: 등산로)를 클라이언트에서 직접 로딩하고 표시합니다.

// OpenLayers library imports
import { Map, View } from 'ol'; // 지도 객체와 뷰 관리 객체
import TileLayer from 'ol/layer/Tile'; // WMS는 주로 TileLayer로 사용됩니다.
import XYZ from 'ol/source/XYZ'; // XYZ 타일 소스 (VWorld 타일 형태)
// **** 벡터 레이어 관련 import 추가 ****
import VectorLayer from 'ol/layer/Vector'; // 클라이언트 측 벡터 레이어
import VectorSource from 'ol/source/Vector'; // 벡터 데이터 소스
import GeoJSON from 'ol/format/GeoJSON'; // GeoJSON 파싱 형식
import Style from 'ol/style/Style'; // OpenLayers 스타일
import Stroke from 'ol/style/Stroke'; // 선 스타일

// **** WMS 소스 import 추가 ****
import TileWMS from 'ol/source/TileWMS'; // WMS 레이어의 데이터 소스


import { defaults as defaultControls } from 'ol/control'; // 기본 지도 컨트롤 (줌 버튼 등) 불러오기
// 스타일 import: WMS 스타일은 GeoServer에서 정의되므로 OpenLayers 스타일 관련 import는 필수는 아니지만,
// 기본 스타일이나 다른 목적(예: 선택 시 스타일)을 위해 남겨둘 수 있습니다.
// import Style from 'ol/style/Style'; // 상단에 이미 임포트함
// import Fill from 'ol/style/Fill';
// import CircleStyle from 'ol/style/Circle'; // 포인트 스타일 필요 시 사용


import React, { useEffect, useRef, useState } from 'react'; // React 훅 불러오기
import 'ol/ol.css'; // OpenLayers 기본 스타일 CSS 불러오기 (지도가 제대로 보이게 함)

// VWorld XYZ 타일 서비스 URL (API 키 포함)
// **** 중요 ****: 'YOUR_API_KEY' 부분에 실제 본인의 VWorld 인증키를 넣어주세요.
const VWORLD_XYZ_URL = 'http://xdworld.vworld.kr:8080/2d/Base/201802/{z}/{x}/{y}.png?apiKey=B60B525E-129D-3B8B-880F-77C24CF86AE3';

// **** 논리적 레이어 그룹 설정 목록 ****
// 웹 지도에서 제어할 '논리적' 레이어 그룹들을 여기에 정의합니다.
// 각 그룹은 하위의 실제 WMS 레이어 이름 목록(layerNames) 또는 벡터 파일 URL 목록(fileUrls)을 가집니다.
const logicalLayersConfig = [
    {
        name: '아산천안 토양', // 지도 UI에 표시될 논리적 그룹 이름
        type: 'soil', // 이 그룹의 타입 (범례 및 필터링 구분용)
        layerNames: ['ne:Asan_Cheonan_Soil_1', 'ne:Asan_Cheonan_Soil_2', 'ne:Asan_Cheonan_Soil_3'], // 실제 GeoServer WMS 레이어 이름들
        url: 'http://localhost:8080/geoserver/ne/wms', // 이 그룹 레이어들의 WMS 서비스 주소 (동일해야 함)
        visible: false, // 이 그룹의 초기 가시성 (하위 레이어 전체에 적용)
    },
    {
        name: '임상도', // 지도 UI에 표시될 논리적 그룹 이름
        type: 'imsangdo', // 이 그룹의 타입
        layerNames: ['ne:imsangdo_part1', 'ne:imsangdo_part2', 'ne:imsangdo_part3'], // 실제 GeoServer WMS 레이어 이름들
        url: 'http://localhost:8080/geoserver/ne/wms', // 이 그룹 레이어들의 WMS 서비스 주소
        visible: false, // 이 그룹의 초기 가시성
    },
    // **** 등산로 벡터 레이어 그룹 추가 (병합된 파일 사용) ****
    {
        name: '등산로', // 지도 UI에 표시될 논리적 그룹 이름
        type: 'hiking_trail', // 이 그룹의 타입
        // **** QGIS에서 병합한 단일 GeoJSON 파일의 경로만 지정 ****
        // **** public 폴더 아래 실제 파일 경로 및 이름으로 수정 필요! ****
        fileUrls: ['/merged_hiking_trails.geojson'], // <<-- 병합된 파일 경로 하나만!
        visible: false, // 이 그룹의 초기 가시성
    },
    // 다른 논리적 레이어 그룹이 있다면 여기에 추가 객체 형태로 넣어줍니다.
];


// **** 토양형 코드 (SLTP_CD) 에 따른 색상 매핑 정의 (토양 범례용) ****
const soilColorMap = {
    '01': '#c8824c', '02': '#c8ab4f', '03': '#c6c9b7', '05': '#efc27e',
    '06': '#19ee12', '28': '#7182d9', '82': '#d2533f', '91': '#62e0d6',
    '93': '#8ce7b5', '94': '#de386f', '95': '#80ee19', '99': '#128cd2',
    // 다른 SLTP_CD 코드와 색상이 더 있다면 여기에 계속 추가합니다.
};

// **** 토양형 코드 (SLTP_CD) 값에 따른 코드명/설명 매핑 정의 (토양 범례용) ****
const soilCodeDescriptions = {
    '01': '갈색건조림토양(1)', '02': '갈색산림토양(2)', '03': '갈색산림토양(3)', '05': '암갈색산림토양',
    '06': '매우깊은갈색산림토양', '28': '식양질논토양', '82': '사질밭토양', '91': '회색토',
    '93': '신흥이탄토양', '94': '경작지', '95': '특이토양', '99': '하천부지',
    // 다른 SLTP_CD 코드와 설명이 더 있다면 여기에 계속 추가합니다.
};

// **** 임상도 데이터의 스타일링 속성(예: 임상 코드 FRTP_CD)에 따른 색상 매핑 정의 (임상도 범례용) ****
const imsangdoColorMap = {
    '0': '#e0447a', '1': '#56d014', '2': '#b370d7', '3': '#34ca96', '4': '#4e7bcf',
    // 임상도 스타일링에 사용된 다른 속성 값과 색상 매핑 정보가 더 있다면 여기에 계속 추가합니다.
};

// **** 임상도 데이터의 스타일링 속성 값(FRTP_CD)에 따른 코드명/설명 매핑 정의 (임상도 범례용) ****
const imsangdoCodeDescriptions = {
    '0': '무립목지 / 비산림', '1': '침엽수림', '2': '활엽수림', '3': '혼효림', '4': '죽림',
    // 임상도 스타일링에 사용된 다른 속성 값과 설명이 더 있다면 여기에 계속 추가합니다.
};

// **** 등산로 데이터의 클라이언트 측 스타일 정의 (Vector Layer용) ****
// 등산로 속성(예: 난이도)에 따라 스타일을 다르게 정의하고 싶다면 여기에 로직 추가 및 스타일 객체 변경
const hikingTrailStyle = new Style({
    stroke: new Stroke({ // 선 스타일
        color: '#4a148c', // 보라색 계열 예시
        width: 2,
        lineDash: [5, 5], // 점선 예시
    }),
});

// **** 등산로 범례 데이터 (단일 스타일 또는 속성 기반) ****
// 등산로 스타일이 단순하다면 단일 항목 범례 사용
const hikingTrailLegend = {
    color: hikingTrailStyle.getStroke().getColor(), // 위 스타일에서 색상 가져오기
    description: '등산로', // 범례 설명
    // 등산로 속성에 따라 스타일을 다르게 적용했다면, soilColorMap처럼 객체 형태로 정의 필요
    // hikingTrailColorMap = { 'easy': 'green', 'hard': 'red' };
    // hikingTrailDescriptions = { 'easy': '쉬움', '어려움' };
};


const VWorldMap = () => {
    // 지도 객체, OpenLayers 맵 인스턴스들을 위한 ref
    const mapRef = useRef(null);
    const olMapRef = useRef(null);
     // **** 개별 WMS 레이어 또는 단일 벡터 레이어 인스턴스들을 저장할 객체 (ref 사용) ****
     // 키: WMS 레이어는 개별 layerName, 벡터 레이어는 논리적 그룹 name
    const wmsLayersRef = useRef({});

    // **** 논리적 레이어 그룹의 가시성 상태 관리 (체크박스용) ****
    const [layerVisibility, setLayerVisibility] = useState(() => {
        const initialVisibility = {};
        logicalLayersConfig.forEach(group => {
            initialVisibility[group.name] = group.visible; // 논리적 그룹 이름을 키로 사용
        });
        return initialVisibility;
    });

    // **** 활성 토양 코드 필터 상태 관리 (토양 레이어 범례 클릭 필터링용) ****
    const [activeSoilCodeFilter, setActiveSoilCodeFilter] = useState([]);

     // **** 활성 임상도 코드 필터 상태 관리 (임상도 레이어 범례 클릭 필터링용) ****
    const [activeImsangdoCodeFilter, setActiveImsangdoCodeFilter] = useState([]);

    // **** 현재 지도에 표시되어야 할 범례의 종류 상태 관리 ****
    // 켜져 있는 논리적 그룹의 타입(type) 목록을 담는 배열입니다.
    const [visibleLegendTypes, setVisibleLegendTypes] = useState([]);

    // **** 범례 섹션 접힘 상태 관리 ****
    const [collapsedLegends, setCollapsedLegends] = useState({
        soil: false, // 토양 범례 초기 상태 (false: 펼침, true: 접힘)
        imsangdo: false, // 임상도 범례 초기 상태
        // 등산로 범례 접힘 상태 추가 (필요시)
        // hiking_trail: false, // 등산로 범례에 접기/펼치기 기능 추가 시 사용
    });

    // **** 레이어 투명도 상태 관리 ****
    const [soilOpacity, setSoilOpacity] = useState(1); // 토양 레이어 그룹 투명도 (0.0 ~ 1.0)
    const [imsangdoOpacity, setImsangdoOpacity] = useState(1); // 임상도 레이어 그룹 투명도
    // **** 등산로 레이어 투명도 상태 추가 ****
    const [hikingTrailOpacity, setHikingTrailOpacity] = useState(1); // 등산로 레이어 그룹 투명도


    // useEffect: 컴포넌트 마운트 시 OpenLayers 지도 생성 및 초기화
    // logicalLayersConfig에 정의된 모든 하위 레이어 또는 벡터 파일을 로딩하고 지도에 추가합니다.
    useEffect(() => {
        console.log('useEffect 실행: OpenLayers 지도 초기화 시작');

        if (!mapRef.current) {
            console.error('useEffect: 지도를 표시할 DOM 엘리먼트(mapRef.current)를 찾을 수 없습니다.');
            return;
        }

        // OpenLayers Map 인스턴스 생성 (VWorld 배경 지도 포함)
        const map = new Map({
            target: mapRef.current, // 지도를 표시할 DOM 엘리먼트 전달
            controls: defaultControls(), // 기본 컨트롤 (줌 버튼 등)
            layers: [
                // VWorld XYZ 타일 레이어 (배경 지도) 추가
                new TileLayer({
                    source: new XYZ({
                        url: VWORLD_XYZ_URL, // VWorld XYZ 타일 서비스 주소
                        attributions: '© <a href="http://vworld.kr">VWorld</a>', // 출처 표시
                        maxZoom: 19 // VWorld 타일 최대 줌 레벨
                    })
                })
            ],
            view: new View({
                center: [127.8, 36.5], // 초기 중심 좌표 (WGS84)
                zoom: 7, // 초기 확대 레벨
                projection: 'EPSG:4326' // 지도 뷰의 프로젝션 (WGS84 경위도)
            })
        });

        olMapRef.current = map; // 지도 인스턴스를 ref에 저장
        console.log('OpenLayers 지도 인스턴스 생성 완료.');

        // --- 레이어 로딩 및 추가 로직 (WMS 및 벡터 모두 포함) ---
        console.log('레이어 로딩 시작.');

        // logicalLayersConfig 배열의 각 논리적 그룹을 순회
        logicalLayersConfig.forEach(groupConfig => {

            if (groupConfig.type === 'soil' || groupConfig.type === 'imsangdo') {
                // **** WMS 레이어 그룹 처리 (기존 로직 유지) ****
                 console.log(`WMS 레이어 그룹 추가 시도: ${groupConfig.name}`);
                groupConfig.layerNames.forEach(individualLayerName => {
                     const wmsSource = new TileWMS({
                         url: groupConfig.url,
                         params: {
                             'LAYERS': individualLayerName,
                             'FORMAT': 'image/png',
                             'TILED': true,
                             'VERSION': '1.1.1',
                         },
                         serverType: 'geoserver',
                          projection: 'EPSG:4326',
                     });

                     const wmsLayer = new TileLayer({
                         source: wmsSource,
                         visible: layerVisibility[groupConfig.name],
                         opacity: groupConfig.type === 'soil' ? soilOpacity : imsangdoOpacity,
                     });

                     map.addLayer(wmsLayer);
                     console.log(`개별 WMS 레이어 추가 완료: ${individualLayerName}`);
                     wmsLayersRef.current[individualLayerName] = wmsLayer; // 개별 WMS 레이어는 이름으로 저장
                });
            } else if (groupConfig.type === 'hiking_trail') {
                // **** 등산로 벡터 레이어 그룹 처리 (병합된 파일 사용) ****
                console.log(`벡터 레이어 그룹 추가 시도: ${groupConfig.name}`);

                // 등산로 데이터 파일을 로딩할 단일 VectorSource 생성
                const vectorSource = new VectorSource({
                    // GeoJSON 데이터 로딩은 비동기적으로 아래에서 처리
                });

                // 단일 VectorLayer 생성 (스타일 적용)
                const vectorLayer = new VectorLayer({
                    source: vectorSource,
                    style: hikingTrailStyle, // 위에서 정의한 클라이언트 측 스타일 적용
                    visible: layerVisibility[groupConfig.name], // 그룹 가시성 따름
                    opacity: hikingTrailOpacity, // 등산로 그룹 투명도 따름
                     // 이 벡터 레이어는 필터링을 지원하지 않으므로 renderMode 등을 고려할 필요는 없지만,
                     // 만약 등산로 속성 기반 필터링이 필요하다면 소스 필터링 등을 구현해야 함
                });

                // VectorLayer를 지도에 추가 (WMS 레이어 위에 표시되도록 순서 조정 필요 시 map.getLayers().getArray() 조작 등 필요)
                map.addLayer(vectorLayer);
                console.log(`벡터 레이어 추가 완료: ${groupConfig.name}`);

                // Vector 레이어 인스턴스는 논리적 그룹 이름으로 저장
                wmsLayersRef.current[groupConfig.name] = vectorLayer;


                // **** 병합된 단일 GeoJSON 파일에서 데이터를 불러와 단일 VectorSource에 추가 ****
                const geojsonFormat = new GeoJSON(); // GeoJSON 파서 인스턴스

                // groupConfig.fileUrls 배열에 단 하나의 파일 URL만 있을 것임
                // 배열의 첫 번째 요소 (단일 파일 URL)만 사용
                const fileUrl = groupConfig.fileUrls[0];
                if (fileUrl) { // fileUrl이 존재하는지 확인
                     console.log(`등산로 GeoJSON 파일 로딩 시도: ${fileUrl}`);
                     fetch(fileUrl) // public 폴더의 파일을 불러옴
                         .then(response => {
                              if (!response.ok) {
                                 throw new Error(`HTTP error! status: ${response.status}`);
                             }
                             return response.json(); // JSON으로 파싱
                         })
                         .then(geojson => {
                             // GeoJSON 데이터에서 피처 읽기
                             const features = geojsonFormat.readFeatures(geojson, {
                                  // **** 중요: GeoJSON 데이터의 원본 CRS와 지도 뷰 CRS 설정 확인 및 수정 필요! ****
                                  // 예: GeoJSON 파일 CRS가 EPSG:4326이고 지도 뷰도 EPSG:4326인 경우 아래처럼 설정
                                  dataProjection: 'EPSG:4326', // GeoJSON 파일 데이터의 CRS (실제 CRS에 맞게 수정 필요!)
                                  featureProjection: 'EPSG:4326', // 지도 뷰의 CRS (EPSG:4326)
                             });
                             // 읽어온 피처들을 단일 VectorSource에 추가
                             vectorSource.addFeatures(features);
                             console.log(`등산로 GeoJSON 파일 로딩 완료 및 피처 추가: ${fileUrl}, 피처 수: ${features.length}`);
                         })
                         .catch(error => {
                             console.error(`등산로 GeoJSON 파일 로딩 오류: ${fileUrl}`, error);
                         });
                } else {
                    console.error(`등산로 GeoJSON 파일 URL이 지정되지 않았습니다.`);
                }
            }
            // 다른 레이어 그룹 타입이 있다면 여기에 else if 로 추가 로직 구현
        });


        console.log('useEffect: OpenLayers 지도 초기화 실행 종료.');

        // Cleanup function: 컴포넌트 언마운트 시 지도 인스턴스 및 리소스 정리
        return () => {
            console.log('컴포넌트 언마운트: OpenLayers 지도 정리 실행');
            if (olMapRef.current) {
                olMapRef.current.dispose();
                console.log('OpenLayers 지도 인스턴스 정리 완료.');
                olMapRef.current = null;
                wmsLayersRef.current = {};
            }
             console.log('정리 함수 실행 완료.');
        };

    }, []); // Empty dependency array - 컴포넌트가 처음 마운트될 때 단 한 번만 실행

    // useEffect: layerVisibility 상태 변화를 감지하고 개별 WMS 또는 벡터 레이어의 가시성을 업데이트
    useEffect(() => {
        console.log('layerVisibility useEffect 실행:', layerVisibility);
        if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) {
            console.log('layerVisibility useEffect: 맵 인스턴스 또는 레이어 ref 없음. 건너뜀.');
            return;
        }

        logicalLayersConfig.forEach(groupConfig => {
            const isGroupVisible = layerVisibility[groupConfig.name]; // 논리적 그룹 가시성 상태

            if (groupConfig.type === 'soil' || groupConfig.type === 'imsangdo') {
                // WMS 레이어 가시성 설정
                groupConfig.layerNames.forEach(individualLayerName => {
                     const layer = wmsLayersRef.current[individualLayerName];
                     if (layer && layer.getVisible() !== isGroupVisible) {
                           console.log(`개별 WMS 레이어 가시성 업데이트 (${individualLayerName}): ${isGroupVisible} (그룹 ${groupConfig.name} 상태 따름)`);
                           layer.setVisible(isGroupVisible);
                       }
                });
            } else if (groupConfig.type === 'hiking_trail') {
                // **** 벡터 레이어 가시성 설정 ****
                 const vectorLayer = wmsLayersRef.current[groupConfig.name]; // 논리적 그룹 이름으로 벡터 레이어 가져옴
                  if (vectorLayer && vectorLayer.getVisible() !== isGroupVisible) {
                       console.log(`벡터 레이어 가시성 업데이트 (${groupConfig.name}): ${isGroupVisible}`);
                       vectorLayer.setVisible(isGroupVisible);
                  }
            }
            // 다른 레이어 그룹 타입 처리 필요시 추가
        });

    }, [layerVisibility, wmsLayersRef, logicalLayersConfig]);

    // useEffect: 켜져 있는 논리적 레이어 그룹의 타입 목록(visibleLegendTypes)을 업데이트합니다.
     useEffect(() => {
         const currentlyVisibleTypes = logicalLayersConfig
             .filter(group => layerVisibility[group.name]) // 켜져 있는 그룹만 필터링
             .map(group => group.type); // 해당 그룹들의 타입만 추출
         setVisibleLegendTypes(currentlyVisibleTypes); // 상태 업데이트
         console.log('Visible legend types:', currentlyVisibleTypes);
     }, [layerVisibility, logicalLayersConfig]);


    // **** useEffect: activeSoilCodeFilter 상태 변화 감지 및 토양 WMS 레이어 필터 업데이트 ****
     useEffect(() => {
        console.log('activeSoilCodeFilter useEffect 실행:', activeSoilCodeFilter);

        if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) {
             console.log('Soil Filter useEffect: 맵 인스턴스 또는 레이어 ref 없음. 건너뜀.');
            return;
        }

        let cqlFilter = undefined;
        if (activeSoilCodeFilter && activeSoilCodeFilter.length > 0) {
            const quotedCodes = activeSoilCodeFilter.map(code => `'${code}'`).join(',');
            cqlFilter = `SLTP_CD IN (${quotedCodes})`; // 토양 데이터 필터링 속성 이름
            console.log(`Constructed CQL_FILTER (Soil): ${cqlFilter}`);
        } else {
            console.log('activeSoilCodeFilter is empty, clearing filter (Soil).');
        }

        const soilGroup = logicalLayersConfig.find(group => group.type === 'soil');
        if (soilGroup) {
            soilGroup.layerNames.forEach(individualLayerName => {
                 const layer = wmsLayersRef.current[individualLayerName];
                 if (layer) {
                     const source = layer.getSource();
                     const params = source.getParams();

                     if (cqlFilter !== undefined) {
                          params.CQL_FILTER = cqlFilter;
                     } else {
                          delete params.CQL_FILTER;
                     }
                     source.updateParams(params);
                 }
            });
        }

    }, [activeSoilCodeFilter, wmsLayersRef, logicalLayersConfig]); // 의존성 배열

    // **** useEffect: activeImsangdoCodeFilter 상태 변화 감지 및 임상도 WMS 레이어 필터 업데이트 ****
     useEffect(() => {
        console.log('activeImsangdoCodeFilter useEffect 실행:', activeImsangdoCodeFilter);

        if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) {
             console.log('Imsangdo Filter useEffect: 맵 인스턴스 또는 레이어 ref 없음. 건너뜀.');
            return;
        }

        let cqlFilter = undefined;
        if (activeImsangdoCodeFilter && activeImsangdoCodeFilter.length > 0) {
            const quotedCodes = activeImsangdoCodeFilter.map(code => `'${code}'`).join(',');
             // 임상도 데이터 필터링 속성 이름은 'FRTP_CD'
            const imsangdoAttributeName = 'FRTP_CD';

             if (imsangdoAttributeName && imsangdoAttributeName !== '<임상도 스타일링에 사용한 속성 이름>') { // 경고 조건 수정
                cqlFilter = `${imsangdoAttributeName} IN (${quotedCodes})`;
                console.log(`Constructed CQL_FILTER (Imsangdo): ${cqlFilter}`);
             } else {
                  // 속성 이름이 없거나 기본값인 경우 경고 및 필터 적용 안 함
                  console.warn("WARNING: 임상도 필터링 속성 이름이 설정되지 않았거나 기본값입니다. 임상도 필터가 작동하지 않습니다.");
                  cqlFilter = undefined;
             }
        } else {
             console.log('activeImsangdoCodeFilter is empty, clearing filter (Imsangdo).');
        }

        const imsangdoGroup = logicalLayersConfig.find(group => group.type === 'imsangdo');
         if (imsangdoGroup) {
             imsangdoGroup.layerNames.forEach(individualLayerName => {
                  const layer = wmsLayersRef.current[individualLayerName];
                  if (layer) {
                      const source = layer.getSource();
                      const params = source.getParams();

                      if (cqlFilter !== undefined) {
                           params.CQL_FILTER = cqlFilter;
                      } else {
                           delete params.CQL_FILTER;
                      }
                      source.updateParams(params);
                  }
             });
         }

     }, [activeImsangdoCodeFilter, wmsLayersRef, logicalLayersConfig]);

    // **** useEffect: 토양 레이어 그룹 투명도 상태 변화 감지 및 적용 ****
     useEffect(() => {
        console.log('soilOpacity useEffect 실행:', soilOpacity);
         if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) {
             console.log('soilOpacity useEffect: 맵 인스턴스 또는 레이어 ref 없음. 건너뜀.');
             return;
         }
         const soilGroup = logicalLayersConfig.find(group => group.type === 'soil');
         if (soilGroup) {
             soilGroup.layerNames.forEach(individualLayerName => {
                 const layer = wmsLayersRef.current[individualLayerName];
                 if (layer) {
                     console.log(`토양 레이어 (${individualLayerName}) 투명도 설정: ${soilOpacity}`);
                     layer.setOpacity(soilOpacity);
                 }
             });
         }
     }, [soilOpacity, wmsLayersRef, logicalLayersConfig]);

     // **** useEffect: 임상도 레이어 그룹 투명도 상태 변화 감지 및 적용 ****
      useEffect(() => {
         console.log('imsangdoOpacity useEffect 실행:', imsangdoOpacity);
          if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) {
              console.log('imsangdoOpacity useEffect: 맵 인스턴스 또는 레이어 ref 없음. 건너뜀.');
              return;
          }
          const imsangdoGroup = logicalLayersConfig.find(group => group.type === 'imsangdo');
          if (imsangdoGroup) {
              imsangdoGroup.layerNames.forEach(individualLayerName => {
                  const layer = wmsLayersRef.current[individualLayerName];
                  if (layer) {
                      console.log(`임상도 레이어 (${individualLayerName}) 투명도 설정: ${imsangdoOpacity}`);
                      layer.setOpacity(imsangdoOpacity);
                  }
              });
          }
      }, [imsangdoOpacity, wmsLayersRef, logicalLayersConfig]);

    // **** useEffect: 등산로 레이어 그룹 투명도 상태 변화 감지 및 적용 ****
     useEffect(() => {
         console.log('hikingTrailOpacity useEffect 실행:', hikingTrailOpacity);
          if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) {
              console.log('hikingTrailOpacity useEffect: 맵 인스턴스 또는 레이어 ref 없음. 건너뜀.');
              return;
          }
          const hikingTrailGroup = logicalLayersConfig.find(group => group.type === 'hiking_trail');
          if (hikingTrailGroup) {
              const vectorLayer = wmsLayersRef.current[hikingTrailGroup.name];
              if (vectorLayer) {
                   console.log(`등산로 레이어 (${hikingTrailGroup.name}) 투명도 설정: ${hikingTrailOpacity}`);
                   vectorLayer.setOpacity(hikingTrailOpacity);
              }
          }
      }, [hikingTrailOpacity, wmsLayersRef, logicalLayersConfig]);


    // 체크박스 클릭 시 논리적 레이어 그룹의 가시성 상태를 토글하는 핸들러
    const handleToggleVisibility = (groupName) => {
        console.log(`레이어 그룹 토글 요청: ${groupName}`);
        setLayerVisibility(prevVisibility => {
            const newVisibility = {
                ...prevVisibility,
                [groupName]: !prevVisibility[groupName]
            };

            // 논리적 그룹이 꺼질 때 해당 그룹의 필터 상태도 초기화 및 범례 펼침 (선택 사항)
            if (!newVisibility[groupName]) {
                 const group = logicalLayersConfig.find(g => g.name === groupName);
                 if (group) {
                     if (group.type === 'soil') {
                          setActiveSoilCodeFilter([]);
                          setCollapsedLegends(prevState => ({ ...prevState, soil: false }));
                     } else if (group.type === 'imsangdo') {
                          setActiveImsangdoCodeFilter([]);
                          setCollapsedLegends(prevState => ({ ...prevState, imsangdo: false }));
                     }
                     // 등산로 레이어는 필터링 기능이 없으므로 초기화 로직 필요 없음
                 }
            }

            return newVisibility;
        });
    };

    // **** 투명도 변경 핸들러 ****
    const handleOpacityChange = (groupType, event) => {
        const newOpacity = parseFloat(event.target.value);
        if (groupType === 'soil') {
            setSoilOpacity(newOpacity);
        } else if (groupType === 'imsangdo') {
            setImsangdoOpacity(newOpacity);
        } else if (groupType === 'hiking_trail') {
             setHikingTrailOpacity(newOpacity);
        }
    };


    // **** 범례 항목 클릭 시 필터를 적용/해제하는 핸들러 (토양 레이어용 - 다중 선택 지원) ****
    const handleSoilLegendItemClick = (code) => {
        console.log(`토양 범례 항목 클릭: 코드 ${code}`);
        setActiveSoilCodeFilter(prevFilter => {
            const newFilter = [...prevFilter];
            const codeIndex = newFilter.indexOf(code);

            if (codeIndex > -1) {
                newFilter.splice(codeIndex, 1);
            } else {
                newFilter.push(code);
                newFilter.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            }
            console.log(`토양 코드 필터 업데이트:`, newFilter);
            return newFilter;
        });
    };

    // **** '모두 표시' 클릭 핸들러 (토양 필터 해제용) ****
    const handleShowAllSoilClick = () => {
        console.log('모두 표시 클릭 (토양)');
        setActiveSoilCodeFilter([]);
    };

    // **** 임상도 범례 항목 클릭 시 필터를 적용/해제하는 핸들러 (임상도 레이어용 - 다중 선택 지원) ****
    const handleImsangdoLegendItemClick = (code) => {
        console.log(`임상도 범례 항목 클릭: 코드 ${code}`);
         setActiveImsangdoCodeFilter(prevFilter => {
             const newFilter = [...prevFilter];
             const codeIndex = newFilter.indexOf(code);

             if (codeIndex > -1) {
                 newFilter.splice(codeIndex, 1);
             } else {
                 newFilter.push(code);
                 newFilter.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)); // 숫자인 경우
             }
             console.log(`임상도 코드 필터 업데이트:`, newFilter);
             return newFilter;
         });
    };

     // **** '임상도 모두 표시' 클릭 핸들러 (임상도 필터 해제용) ****
    const handleShowAllImsangdoClick = () => {
        console.log('모두 표시 클릭 (임상도)');
        setActiveImsangdoCodeFilter([]);
    };

    // **** 범례 섹션 접기/펼치기 핸들러 ****
    const toggleLegendCollapse = (type) => {
        console.log(`Toggle legend collapse for: ${type}`);
        // 등산로 범례는 현재 접기/펼치기 기능이 없으므로 soil 또는 imsangdo 타입만 처리
        if (type === 'soil' || type === 'imsangdo') {
             setCollapsedLegends(prevState => ({
                 ...prevState,
                 [type]: !prevState[type],
             }));
        }
    };


    // **** 범례 색상 표본 스타일 ****
    const colorSwatchStyle = {
        width: '20px',
        height: '20px',
        opacity: 0.8,
        border: '1px solid #333',
        marginRight: '10px',
        flexShrink: 0
    };

     // **** 범례 컨테이너 스타일 ****
     const legendContainerStyle = {
         position: 'absolute',
         bottom: '10px',
         left: '10px',
         zIndex: 100,
         backgroundColor: 'rgba(255, 255, 255, 0.9)',
         padding: '10px',
         border: '1px solid #ccc',
         borderRadius: '5px',
         maxHeight: '80vh',
         overflowY: 'auto',
         fontSize: '12px',
         color: '#333',
         textAlign: 'left',
         pointerEvents: 'auto',
     };


    // React 컴포넌트 렌더링 내용 (JSX)
    return (
        // 메인 컨테이너 div (flexbox 레이아웃으로 전체 화면 높이 사용)
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

            {/* 레이어 제어 UI 영역 (논리적 그룹 기준으로 표시) */}
            <div style={{ padding: '10px', borderBottom: '1px solid #ccc', backgroundColor: '#f9f9f9', flexShrink: 0 }}>
                <h4>데이터 레이어 표시/숨기기 및 투명도</h4>
                {logicalLayersConfig.map(groupConfig => (
                    <div key={groupConfig.name} style={{ marginBottom: '10px' }}>
                        {/* 체크박스 */}
                        <label style={{ marginRight: '15px' }}>
                            <input
                                type="checkbox"
                                checked={layerVisibility[groupConfig.name] || false}
                                onChange={() => handleToggleVisibility(groupConfig.name)}
                            />
                            {groupConfig.name}
                        </label>

                        {/* **** 투명도 조절 컨트롤 (레이어가 켜져 있을 때만 표시) **** */}
                        {layerVisibility[groupConfig.name] && (
                             <div style={{ display: 'inline-block', marginLeft: '10px', verticalAlign: 'middle' }}>
                                <label htmlFor={`opacity-${groupConfig.type}`} style={{ marginRight: '5px', fontSize: '11px' }}>투명도:</label>
                                 {/* 투명도 슬라이더 */}
                                 <input
                                    id={`opacity-${groupConfig.type}`}
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={groupConfig.type === 'soil' ? soilOpacity : (groupConfig.type === 'imsangdo' ? imsangdoOpacity : hikingTrailOpacity)}
                                    onChange={(event) => handleOpacityChange(groupConfig.type, event)}
                                    style={{ width: '100px', verticalAlign: 'middle' }}
                                 />
                                 {/* 현재 투명도 값 표시 (소수점 둘째 자리까지) */}
                                 <span style={{ marginLeft: '5px', fontSize: '11px' }}>
                                    {(groupConfig.type === 'soil' ? soilOpacity : (groupConfig.type === 'imsangdo' ? imsangdoOpacity : hikingTrailOpacity)).toFixed(2)}
                                 </span>
                             </div>
                        )}
                    </div>
                ))}
            </div>

             {/* 지도가 렌더링될 div 영역 */}
            <div ref={mapRef} style={{ width: '100%', flexGrow: 1 }}>
                {/* 이 div 안에 OpenLayers 지도가 표시됩니다. */}
            </div>

            {/* **** 범례 UI 영역 (동적 표시 및 통합, 스크롤, 접기/펼치기) **** */}
            {/* visibleLegendTypes 배열에 하나 이상의 타입이 있을 때만 범례 컨테이너 표시 */}
            <div style={{ ...legendContainerStyle, display: visibleLegendTypes.length > 0 ? 'block' : 'none' }}>
                {/* **** 범례 제목 (항상 표시) **** */}
                 <h4>범례</h4>

                {/* **** 토양 범례 섹션 (visibleLegendTypes에 'soil' 포함 시 표시) **** */}
                {visibleLegendTypes.includes('soil') && (
                    // visibleLegendTypes 배열에서 'soil'이 첫 번째 요소가 아니면 상단 마진 추가 (구분선 효과)
                    <div style={{ marginTop: (visibleLegendTypes.indexOf('soil') > 0) ? '10px' : '0' }}>
                        {/* 토양 범례 제목 (클릭하여 접기/펼치기) */}
                        <h4
                             style={{ cursor: 'pointer', marginBottom: '5px' }}
                             onClick={() => toggleLegendCollapse('soil')}
                        >
                             토양 범례 (클릭하여 필터) {collapsedLegends.soil ? '[보이기]' : '[숨기기]'}
                        </h4>
                        {/* 토양 범례 항목 컨테이너 (접힘 상태가 아닐 때만 렌더링) */}
                        {!collapsedLegends.soil && (
                            <>
                                {/* '모두 표시' 옵션 (토양 필터 해제용) */}
                                <div
                                    style={{
                                        marginBottom: '10px',
                                        cursor: 'pointer',
                                        textDecoration: activeSoilCodeFilter.length === 0 ? 'underline' : 'none',
                                        fontWeight: activeSoilCodeFilter.length === 0 ? 'bold' : 'normal',
                                        padding: '2px 5px',
                                        borderRadius: '3px',
                                        backgroundColor: activeSoilCodeFilter.length === 0 ? '#eee' : 'transparent',
                                    }}
                                    onClick={handleShowAllSoilClick}
                                >
                                    모두 표시
                                </div>
                                {/* 구분선 (모두 표시 아래, 범례 항목 위) */}
                               <div style={{ borderBottom: '1px solid #ccc', margin: '5px 0' }}></div>

                                {/* 토양 범례 항목 생성 */}
                                {Object.keys(soilColorMap)
                                    .sort((a, b) => {
                                        const numA = parseInt(a, 10);
                                        const numB = parseInt(b, 10);
                                        if (!isNaN(numA) && !isNaN(numB)) { return numA - numB; }
                                        return a.localeCompare(b);
                                    })
                                    .map(code => (
                                        soilCodeDescriptions[code] && (
                                            <div
                                                key={'soil-' + code}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    marginBottom: '5px',
                                                    cursor: 'pointer',
                                                    fontWeight: activeSoilCodeFilter.includes(code) ? 'bold' : 'normal',
                                                    backgroundColor: activeSoilCodeFilter.includes(code) ? '#eee' : 'transparent',
                                                    padding: '2px 5px',
                                                    borderRadius: '3px',
                                                }}
                                                onClick={() => handleSoilLegendItemClick(code)}
                                            >
                                                {/* 색상 표본 사각형 */}
                                                <div style={{ ...colorSwatchStyle, backgroundColor: soilColorMap[code] }}></div>
                                                {/* 코드 설명 텍스트 */}
                                                <span><strong>{code}</strong> - {soilCodeDescriptions[code]}</span>
                                            </div>
                                        )
                                    )
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* **** 임상도 범례 섹션 (visibleLegendTypes에 'imsangdo' 포함 시 표시) **** */}
                {visibleLegendTypes.includes('imsangdo') && (
                    // visibleLegendTypes 배열에서 'imsangdo'가 첫 번째 요소가 아니면 상단 마진 추가
                     <div style={{ marginTop: (visibleLegendTypes.indexOf('imsangdo') > 0) ? '10px' : '0' }}>
                         {/* 임상도 범례 제목 (클릭하여 접기/펼치기) */}
                          <h4
                               style={{ cursor: 'pointer', marginBottom: '5px' }}
                               onClick={() => toggleLegendCollapse('imsangdo')}
                           >
                              임상도 범례 (클릭하여 필터) {collapsedLegends.imsangdo ? '[보이기]' : '[숨기기]'}
                           </h4>
                           {/* 임상도 범례 항목 컨테이너 (접힘 상태가 아닐 때만 렌더링) */}
                          {!collapsedLegends.imsangdo && (
                              <>
                                  {/* '모두 표시' 옵션 (임상도 필터 해제용) */}
                                   <div
                                      style={{
                                          marginBottom: '10px',
                                          cursor: 'pointer',
                                          textDecoration: activeImsangdoCodeFilter.length === 0 ? 'underline' : 'none',
                                          fontWeight: activeImsangdoCodeFilter.length === 0 ? 'bold' : 'normal',
                                          padding: '2px 5px',
                                          borderRadius: '3px',
                                          backgroundColor: activeImsangdoCodeFilter.length === 0 ? '#eee' : 'transparent',
                                      }}
                                      onClick={() => handleShowAllImsangdoClick()}
                                  >
                                      모두 표시
                                  </div>
                                   {/* 구분선 (모두 표시 아래, 범례 항목 위) */}
                                  <div style={{ borderBottom: '1px solid #ccc', margin: '5px 0' }}></div>

                                 {/* 임상도 범례 항목 생성 */}
                                 {Object.keys(imsangdoColorMap)
                                     .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                                     .map(code => (
                                         imsangdoCodeDescriptions[code] && (
                                             <div
                                                 key={'imsangdo-' + code}
                                                 style={{
                                                     display: 'flex',
                                                     alignItems: 'center',
                                                     marginBottom: '5px',
                                                     cursor: 'pointer',
                                                     fontWeight: activeImsangdoCodeFilter.includes(code) ? 'bold' : 'normal',
                                                     backgroundColor: activeImsangdoCodeFilter.includes(code) ? '#eee' : 'transparent',
                                                     padding: '2px 5px',
                                                     borderRadius: '3px',
                                                 }}
                                                 onClick={() => handleImsangdoLegendItemClick(code)}
                                             >
                                                 {/* 색상 표본 사각형 */}
                                                 <div style={{ ...colorSwatchStyle, backgroundColor: imsangdoColorMap[code] }}></div>
                                                 {/* 코드 설명 텍스트 */}
                                                 <span><strong>{code}</strong> - {imsangdoCodeDescriptions[code]}</span>
                                             </div>
                                         )
                                     )
                                 )}
                              </>
                          )}
                     </div>
                )}

                {/* **** 등산로 범례 섹션 (visibleLegendTypes에 'hiking_trail' 포함 시 표시) **** */}
                {visibleLegendTypes.includes('hiking_trail') && (
                    // visibleLegendTypes 배열에서 'hiking_trail'이 첫 번째 요소가 아니면 상단 마진 추가
                    <div style={{ marginTop: (visibleLegendTypes.indexOf('hiking_trail') > 0) ? '10px' : '0' }}>
                         <h4>등산로 범례</h4> {/* 등산로 범례 제목 (현재 접기/펼치기 기능 없음) */}
                         {/* 구분선 */}
                         <div style={{ borderBottom: '1px solid #ccc', margin: '5px 0' }}></div>
                         {/* 단일 범례 항목 (등산로 스타일이 단순하다고 가정) */}
                         <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                              <div style={{ ...colorSwatchStyle, backgroundColor: hikingTrailLegend.color }}></div> {/* 색상 표본 */}
                              <span>{hikingTrailLegend.description}</span> {/* 설명 */}
                          </div>
                          {/* 등산로 속성에 따라 필터링 범례가 필요하다면 soil/imsangdo처럼 구현 */}
                     </div>
                )}
            </div>
        </div>
    );
};

export default VWorldMap; // React 컴포넌트 내보내기



// 커밋 테스트