/**
 * 3D图谱画布组件
 * 负责3D图谱的核心渲染和交互功能
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js';
import type { EnhancedNode, EnhancedGraphLink } from './types';

interface GraphCanvas3DProps {
  nodes: EnhancedNode[];
  links: EnhancedGraphLink[];
  onNodeClick: (node: EnhancedNode) => void;
  onLinkClick: (link: EnhancedGraphLink) => void;
  selectedNode: EnhancedNode | null;
  selectedNodes: EnhancedNode[];
}

// 自定义比较函数，用于React.memo
const areEqual = (prevProps: GraphCanvas3DProps, nextProps: GraphCanvas3DProps) => {
  // 比较节点数量和链接数量
  if (prevProps.nodes.length !== nextProps.nodes.length ||
      prevProps.links.length !== nextProps.links.length) {
    return false;
  }
  
  // 比较选中节点
  if (prevProps.selectedNode?.id !== nextProps.selectedNode?.id ||
      prevProps.selectedNodes.length !== nextProps.selectedNodes.length) {
    return false;
  }
  
  return true;
};

export const GraphCanvas3D: React.FC<GraphCanvas3DProps> = React.memo(({
  nodes,
  links,
  onNodeClick,
  onLinkClick,
  selectedNode,
  selectedNodes
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  // 使用object类型替代any，更安全的临时解决方案
  const fontRef = useRef<Font | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化3D场景
  useEffect(() => {
    if (!containerRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 100);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 添加轨道控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // 渲染函数
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 处理窗口大小变化
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 加载字体
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
      fontRef.current = font;
      setIsLoading(false);
    });

    // 保存当前ref值到局部变量
    const currentRenderer = renderer;
    const currentContainer = containerRef.current;
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (controls) {
        controls.dispose();
      }
      if (currentRenderer) {
        currentRenderer.dispose();
        if (currentContainer && currentRenderer.domElement) {
          currentContainer.removeChild(currentRenderer.domElement);
        }
      }
    };
  }, []);

  // 更新3D图谱内容
  useEffect(() => {
    if (!sceneRef.current || !fontRef.current) return;

    const scene = sceneRef.current;
    const font = fontRef.current;

    // 清除现有对象
    scene.children = scene.children.filter(child => 
      child instanceof THREE.Light || child instanceof THREE.AmbientLight
    );

    // 创建节点几何体和材质
    const nodeGeometry = new THREE.SphereGeometry(3, 32, 32);

    // 创建节点
    const nodeObjects: { node: EnhancedNode; mesh: THREE.Mesh; label: THREE.Mesh }[] = [];
    
    nodes.forEach((node, index) => {
      // 检查节点是否被选中
      const isSelected = selectedNode?.id === node.id || selectedNodes.some(n => n.id === node.id);
      
      // 创建节点材质
      const nodeMaterial = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x3b82f6 : 0x1976d2,
        emissive: isSelected ? 0x3b82f6 : 0x000000,
        emissiveIntensity: isSelected ? 0.2 : 0
      });
      
      const mesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
      
      // 计算节点位置 - 使用力导向布局算法的简化版本
      const angle = (index / nodes.length) * Math.PI * 2;
      const radius = 30 + Math.sin(index) * 10;
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        Math.sin(angle * 2) * 10
      );
      
      // 添加点击事件
      mesh.userData = { node };
      
      scene.add(mesh);
      
      // 创建节点标签
      const textGeometry = new TextGeometry(node.title.substring(0, 8), {
        font: font,
        size: 1,
        depth: 0.1,
        curveSegments: 12,
        bevelEnabled: false
      });
      
      const textMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      
      // 定位标签
      textMesh.position.set(
        mesh.position.x,
        mesh.position.y + 5,
        mesh.position.z
      );
      
      // 旋转标签使其始终面向相机
      textMesh.lookAt(cameraRef.current!.position);
      
      scene.add(textMesh);
      
      nodeObjects.push({ node, mesh, label: textMesh });
    });

    // 创建链接
    links.forEach(link => {
      // 处理source
      const sourceId = typeof link.source === 'object' && link.source.id ? link.source.id : link.source;
      const sourceNode = nodes.find(n => n.id === String(sourceId));
      
      // 处理target
      const targetId = typeof link.target === 'object' && link.target.id ? link.target.id : link.target;
      const targetNode = nodes.find(n => n.id === String(targetId));
      
      if (sourceNode && targetNode) {
        const sourceObject = nodeObjects.find(no => no.node.id === sourceNode.id);
        const targetObject = nodeObjects.find(no => no.node.id === targetNode.id);
        
        if (sourceObject && targetObject) {
          // 创建链接几何体
          const linkGeometry = new THREE.BufferGeometry().setFromPoints([
            sourceObject.mesh.position,
            targetObject.mesh.position
          ]);
          
          // 创建链接材质
          const linkMaterial = new THREE.LineBasicMaterial({ 
            color: 0x999999,
            opacity: 0.6,
            transparent: true
          });
          
          const linkLine = new THREE.Line(linkGeometry, linkMaterial);
          
          // 添加点击事件
          linkLine.userData = { link };
          
          scene.add(linkLine);
        }
      }
    });

    // 添加鼠标交互
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const handleMouseClick = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, cameraRef.current);
      
      // 检测节点点击
      const nodeIntersections = raycaster.intersectObjects(nodeObjects.map(no => no.mesh));
      if (nodeIntersections.length > 0) {
        const intersection = nodeIntersections[0];
        if (intersection?.object?.userData?.node) {
          const clickedNode = intersection.object.userData.node;
          onNodeClick(clickedNode);
          return;
        }
      }
      
      // 检测链接点击
      const linkObjects = scene.children.filter(child => 
        child instanceof THREE.Line && child.userData && child.userData.link
      );
      const linkIntersections = raycaster.intersectObjects(linkObjects as THREE.Object3D[]);
      if (linkIntersections.length > 0) {
        const intersection = linkIntersections[0];
        if (intersection?.object?.userData?.link) {
          const clickedLink = intersection.object.userData.link;
          onLinkClick(clickedLink);
        }
      }
    };
    
    const container = containerRef.current;
    container?.addEventListener('click', handleMouseClick);
    
    // 清理事件监听
    return () => {
      container?.removeEventListener('click', handleMouseClick);
    };
  }, [nodes, links, selectedNode, selectedNodes, onNodeClick, onLinkClick]);

  // 导出3D模型为GLTF格式
  const exportToGLTF = () => {
    if (!sceneRef.current) return;

    // 这里可以使用THREE.GLTFExporter来导出模型
    // 暂时使用简单的实现
    alert('3D模型导出功能正在开发中...');
  };

  // 导出3D模型为OBJ格式
  const exportToOBJ = () => {
    if (!sceneRef.current) return;

    // 这里可以实现OBJ导出逻辑
    alert('3D模型导出功能正在开发中...');
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full"></div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
      <div className="absolute top-2 right-2 flex gap-2">
        <button 
          onClick={exportToGLTF}
          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          导出GLTF
        </button>
        <button 
          onClick={exportToOBJ}
          className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
        >
          导出OBJ
        </button>
      </div>
    </div>
  );
}, areEqual);
