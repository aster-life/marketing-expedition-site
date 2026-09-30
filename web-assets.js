import {GLTFLoader} from './assets/vendor/GLTFLoader.js';
import {MeshoptDecoder} from './assets/vendor/meshopt_decoder.module.js';

// 網站讀取壓縮版素材（模型 -slim.glb、貼圖 .webp，解析度不變）；原始 CC0 檔案保留在同目錄。
const slimTextures=/\/(hall-materials|interior-candidates)\/.*\.jpg$|assets\/world\/[^/]+\.png$|start-soft-proportion\.png$/;
export const webAsset=path=>/\.(gltf|glb)$/.test(path)?path.replace(/\.(gltf|glb)$/,'-slim.glb'):slimTextures.test(path)?path.replace(/\.(jpg|png)$/,'.webp'):path;
export const createGLTFLoader=()=>new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
