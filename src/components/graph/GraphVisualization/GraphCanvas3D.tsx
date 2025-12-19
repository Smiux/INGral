/**
 * 3D图谱画布组件
 * 负责3D图谱的核心渲染和交互功能
 */
import React, { useEffect, useRef, useState, useContext } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js';
import type { EnhancedNode, EnhancedGraphConnection } from './types';
import { GraphContext } from './GraphContext';

interface GraphCanvas3DProps {
  nodes: EnhancedNode[];
  connections: EnhancedGraphConnection[];
  onNodeClick: (_node: EnhancedNode) => void;
  onConnectionClick: (_connection: EnhancedGraphConnection) => void;
  selectedNode: EnhancedNode | null;
  selectedNodes: EnhancedNode[];
}

// 自定义比较函数，用于React.memo
const areEqual = (prevProps: GraphCanvas3DProps, nextProps: GraphCanvas3DProps) => {
  // 比较节点数量和链接数量
  if (prevProps.nodes.length !== nextProps.nodes.length ||
      prevProps.connections.length !== nextProps.connections.length) {
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
  connections,
  onNodeClick,
  onConnectionClick,
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

  // 获取Graph上下文
  const graphContext = useContext(GraphContext);

  // 初始化3D场景
  useEffect(() => {
    if (!containerRef.current) {
      // 返回空的清理函数以保持consistent-return
      return () => {};
    }

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
    const renderer = new THREE.WebGLRenderer({ 'antialias': true });
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
      if (!containerRef.current || !camera || !renderer) {
        return;
      }
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
    if (!sceneRef.current || !fontRef.current) {
      // 返回空的清理函数以保持consistent-return
      return () => {};
    }

    const scene = sceneRef.current;
    const font = fontRef.current;

    // 清除现有对象
    scene.children = scene.children.filter(child =>
      child instanceof THREE.Light || child instanceof THREE.AmbientLight
    );

    // 创建节点几何体和材质
    const nodeGeometry = new THREE.SphereGeometry(3, 32, 32);
    const nodeWireframeGeometry = new THREE.SphereGeometry(3.5, 32, 32);

    // 创建节点
    const nodeObjects: { node: EnhancedNode; mesh: THREE.Mesh; label: THREE.Mesh; wireframe: THREE.Line }[] = [];

    nodes.forEach((node, index) => {
      // 检查节点是否被选中
      const isSelected = selectedNode?.id === node.id || selectedNodes.some(n => n.id === node.id);

      // 创建节点材质
      const nodeMaterial = new THREE.MeshStandardMaterial({
        'color': isSelected ? 0x3b82f6 : 0x1976d2,
        'emissive': isSelected ? 0x3b82f6 : 0x000000,
        'emissiveIntensity': isSelected ? 0.3 : 0,
        'metalness': 0.3,
        'roughness': 0.5
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
      mesh.userData = { node, index };
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);

      // 添加选中边框
      const wireframeMaterial = new THREE.LineBasicMaterial({
        'color': isSelected ? 0xffffff : 0x000000,
        'transparent': true,
        'opacity': isSelected ? 0.8 : 0
      });

      const wireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(nodeWireframeGeometry),
        wireframeMaterial
      );
      wireframe.position.copy(mesh.position);
      scene.add(wireframe);

      // 创建节点标签
      const textGeometry = new TextGeometry(node.title.substring(0, 8), {
        font,
        'size': 1,
        'depth': 0.1,
        'curveSegments': 12,
        'bevelEnabled': false
      });

      const textMaterial = new THREE.MeshStandardMaterial({
        'color': 0x000000,
        'transparent': true,
        'opacity': 0.8
      });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);

      // 定位标签
      textMesh.position.set(
        mesh.position.x,
        mesh.position.y + 5,
        mesh.position.z
      );

      // 旋转标签使其始终面向相机
      textMesh.lookAt(cameraRef.current!.position);
      textMesh.castShadow = true;

      scene.add(textMesh);

      nodeObjects.push({ node, mesh, 'label': textMesh, wireframe });
    });

    // 创建链接
    connections.forEach(connection => {
      // 处理source
      const sourceId = typeof connection.source === 'object' && connection.source.id ? connection.source.id : connection.source;
      const sourceNode = nodes.find(n => n.id === String(sourceId));

      // 处理target
      const targetId = typeof connection.target === 'object' && connection.target.id ? connection.target.id : connection.target;
      const targetNode = nodes.find(n => n.id === String(targetId));

      if (sourceNode && targetNode) {
        const sourceObject = nodeObjects.find(no => no.node.id === sourceNode.id);
        const targetObject = nodeObjects.find(no => no.node.id === targetNode.id);

        if (sourceObject && targetObject) {
          // 创建链接几何体
          const connectionGeometry = new THREE.BufferGeometry().setFromPoints([
            sourceObject.mesh.position,
            targetObject.mesh.position
          ]);

          // 创建链接材质
          const connectionMaterial = new THREE.LineBasicMaterial({
            'color': 0x999999,
            'opacity': 0.6,
            'transparent': true,
            'linewidth': 1.5
          });

          const connectionLine = new THREE.Line(connectionGeometry, connectionMaterial);

          // 添加点击事件
          connectionLine.userData = { connection, 'source': sourceObject.mesh, 'target': targetObject.mesh };

          scene.add(connectionLine);
        }
      }
    });

    // 添加鼠标交互
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let draggedObject: THREE.Mesh | null = null;
    const mouseDownPosition = new THREE.Vector2();

    const handleMouseDown = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      mouseDownPosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseDownPosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseDownPosition, cameraRef.current);

      // 检测节点点击
      const nodeIntersections = raycaster.intersectObjects(nodeObjects.map(no => no.mesh));
      if (nodeIntersections.length > 0 && nodeIntersections[0]) {
        isDragging = true;
        draggedObject = nodeIntersections[0].object as THREE.Mesh;
        // 禁用轨道控制器
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !draggedObject || !containerRef.current || !cameraRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // 实现拖拽逻辑
      const plane = new THREE.Plane(cameraRef.current.up, 0);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, cameraRef.current);

      const intersectionPoint = new THREE.Vector3();

      // 使用Three.js的Plane.intersectLine方法代替Raycaster.intersectPlane
      const rayLine = new THREE.Line3(ray.ray.origin, ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(1000)));
      const intersection = plane.intersectLine(rayLine, intersectionPoint);

      if (intersection && draggedObject) {
        draggedObject.position.copy(intersectionPoint);

        // 更新标签位置
        const nodeObject = nodeObjects.find(no => no.mesh === draggedObject);
        if (nodeObject) {
          nodeObject.label.position.copy(draggedObject.position).add(new THREE.Vector3(0, 5, 0));
          nodeObject.label.lookAt(cameraRef.current!.position);
          nodeObject.wireframe.position.copy(draggedObject.position);
        }

        // 更新链接
        connections.forEach(connection => {
          const sourceId = typeof connection.source === 'object' && connection.source.id ? connection.source.id : connection.source;
          const targetId = typeof connection.target === 'object' && connection.target.id ? connection.target.id : connection.target;

          if ((draggedObject as THREE.Mesh).userData.node.id === String(sourceId) || (draggedObject as THREE.Mesh).userData.node.id === String(targetId)) {
            const connectionObjects = scene.children.filter(child =>
              child instanceof THREE.Line && child.userData && child.userData.connection
            ) as THREE.Line[];

            connectionObjects.forEach(connectionLine => {
              if (connectionLine.userData.connection.id === connection.id) {
                const positionAttribute = connectionLine.geometry.attributes.position;
                if (positionAttribute) {
                  const positions = positionAttribute.array as Float32Array;
                  const sourceObject = nodeObjects.find(no => no.node.id === String(sourceId));
                  const targetObject = nodeObjects.find(no => no.node.id === String(targetId));

                  if (sourceObject && targetObject) {
                    positions[0] = sourceObject.mesh.position.x;
                    positions[1] = sourceObject.mesh.position.y;
                    positions[2] = sourceObject.mesh.position.z;
                    positions[3] = targetObject.mesh.position.x;
                    positions[4] = targetObject.mesh.position.y;
                    positions[5] = targetObject.mesh.position.z;
                    positionAttribute.needsUpdate = true;
                  }
                }
              }
            });
          }
        });
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
      draggedObject = null;
      // 启用轨道控制器
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    };

    const handleMouseClick = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current || isDragging) {
        return;
      }

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
      const connectionObjects = scene.children.filter(child =>
        child instanceof THREE.Line && child.userData && child.userData.connection
      );
      const connectionIntersections = raycaster.intersectObjects(connectionObjects as THREE.Object3D[]);
      if (connectionIntersections.length > 0) {
        const intersection = connectionIntersections[0];
        if (intersection?.object?.userData?.connection) {
          const clickedConnection = intersection.object.userData.connection;
          onConnectionClick(clickedConnection);
        }
      }
    };

    // 添加悬停效果
    const handleMouseHover = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      // 检测节点悬停
      const nodeIntersections = raycaster.intersectObjects(nodeObjects.map(no => no.mesh));

      // 重置所有节点
      nodeObjects.forEach(no => {
        no.mesh.scale.set(1, 1, 1);
        // 确保材质是单个材质而非材质数组
        if (no.wireframe.material instanceof THREE.Material) {
          no.wireframe.material.opacity = no.node.id === selectedNode?.id || selectedNodes.some(n => n.id === no.node.id) ? 0.8 : 0;
        }
        if (no.label.material instanceof THREE.Material) {
          no.label.material.opacity = 0.8;
        }
      });

      // 高亮悬停节点
      if (nodeIntersections.length > 0 && nodeIntersections[0]) {
        const intersection = nodeIntersections[0];
        const hoveredMesh = intersection.object as THREE.Mesh;
        const nodeObject = nodeObjects.find(no => no.mesh === hoveredMesh);

        if (nodeObject) {
          hoveredMesh.scale.set(1.2, 1.2, 1.2);
          if (nodeObject.wireframe.material instanceof THREE.Material) {
            nodeObject.wireframe.material.opacity = 0.6;
          }
          if (nodeObject.label.material instanceof THREE.Material) {
            nodeObject.label.material.opacity = 1;
          }
          containerRef.current!.style.cursor = 'pointer';
        }
      } else {
        containerRef.current!.style.cursor = 'default';
      }
    };

    const container = containerRef.current;
    container?.addEventListener('mousedown', handleMouseDown);
    container?.addEventListener('mousemove', handleMouseMove);
    container?.addEventListener('mouseup', handleMouseUp);
    container?.addEventListener('mouseleave', handleMouseUp);
    container?.addEventListener('click', handleMouseClick);
    container?.addEventListener('mousemove', handleMouseHover);

    // 清理事件监听
    return () => {
      container?.removeEventListener('mousedown', handleMouseDown);
      container?.removeEventListener('mousemove', handleMouseMove);
      container?.removeEventListener('mouseup', handleMouseUp);
      container?.removeEventListener('mouseleave', handleMouseUp);
      container?.removeEventListener('click', handleMouseClick);
      container?.removeEventListener('mousemove', handleMouseHover);
    };
  }, [nodes, connections, selectedNode, selectedNodes, onNodeClick, onConnectionClick]);

  // 导出3D模型为GLTF格式
  const exportToGLTF = () => {
    if (!sceneRef.current) {
      return;
    }

    // 这里可以使用THREE.GLTFExporter来导出模型
    // 暂时使用简单的实现
    if (graphContext?.actions?.showNotification) {
      graphContext.actions.showNotification('3D模型导出功能正在开发中...', 'info');
    }
  };

  // 导出3D模型为OBJ格式
  const exportToOBJ = () => {
    if (!sceneRef.current) {
      return;
    }

    // 这里可以实现OBJ导出逻辑
    if (graphContext?.actions?.showNotification) {
      graphContext.actions.showNotification('3D模型导出功能正在开发中...', 'info');
    }
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
