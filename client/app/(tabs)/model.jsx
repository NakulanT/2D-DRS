// import React, { Suspense } from 'react';
// import { Canvas, useThree, useFrame } from '@react-three/fiber/native';
// import { useGLTF, OrbitControls } from '@react-three/drei/native';
// import modelPath from '../../assets/model.glb'; // Update the path to your model if needed
// import { ErrorBoundary } from 'react-error-boundary';

// function Model(props) {
//   const { scene } = useGLTF(modelPath) || {};

//   if (!scene) return null; // Avoid errors if loading fails

//   return <primitive {...props} object={scene} />;
// }

// function DebugCamera() {
//   const { camera } = useThree();

//   useFrame(() => {
//     // Clamp zoom distance (z-axis)
//     // if (camera.position.z < 1) camera.position.z = 1;
//     // if (camera.position.z > 10) camera.position.z = 10;
//     if (camera.position.y < 2) camera.position.y = 2;


//     // Optional: Log camera position for debugging
//     // console.log(`Camera posi///tion -> x: ${camera.position.x}, y: ${camera.position.y}, z: ${camera.position.z}`);
//   });

//   return null; // No visible UI
// }

// function ErrorFallback({ error }) {
//   return (
//     <div style={{ color: 'red', padding: 20 }}>
//       <h3>An error occurred:</h3>
//       <pre>{error.message}</pre>
//     </div>
//   );
// }

// export default function App() {
//   const cameraAxis = {
//     x: 13.496820857545245,
//     y: 2.974224970377211,
//     z: -0.13412446635198547,
//   };
//   const orbitTarget = [5, 1, 0]; // Change the center of orbit here


//   return (
//     <ErrorBoundary FallbackComponent={ErrorFallback}>
//       <Canvas
//         camera={{
//           position: [cameraAxis.x, cameraAxis.y, cameraAxis.z], // Set the camera position dynamically
//           fov: 50,
//         }}
//       >
//         <ambientLight />
//         <Suspense fallback={null}>
//           <Model />
//         </Suspense>
//         <OrbitControls
//           makeDefault // Ensure it binds the controls to the default camera
//           minPolarAngle={Math.PI / 4} // Prevent camera from going below y-axis
//           maxPolarAngle={Math.PI / 2} // Prevent camera from going too high
//           minDistance={1} // Minimum zoom distance
//           maxDistance={20} // Maximum zoom distance
//           enableZoom={true} // Explicitly enable zooming
//           target={orbitTarget} // Set the center position for orbiting
          
//         />
//         <DebugCamera />
//       </Canvas>
//     </ErrorBoundary>
//   );
// }


import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { useGLTF, OrbitControls } from '@react-three/drei/native';
import { Line } from '@react-three/drei';
import { ErrorBoundary } from 'react-error-boundary';
import modelPath from '../../assets/model.glb'; // Update the path to your model if needed


// const Points =  [[-8.921036769138034, 0.29142799718621243, 20], [-8.752260397830018, -0.14068937795196462, 20], [-7.691380349608198, -0.3919204100090443, 20], [-6.534056660638939, -0.29142799718621243, 20], [-5.593731163351417, -0.160787860516531, 20], [-4.798071127185051, -0.020098482564566374, 20], [-4.122965641952984, 0.11054165410511506, 20], [-3.5925256178420737, 0.24118179077479648, 20], [-3.086196503918023, 0.38187116872676113, 20], [-2.6280892103676914, 0.5426590292432921, 20], [-2.2905364677516578, 0.6833484071952567, 20], [-1.9288728149487644, 0.8441362677117877, 20], [-1.6636528028933093, 0.9948748869460355, 20], [-1.3984327908378542, 1.1556627474625665, 20], [-1.1332127787823991, 1.3264998492613806, 20], [-0.9162145871006631, 1.4772384684956286, 20], [-0.6992163954189271, 1.6480755702944427, 20], [-0.5304400241109102, 1.7988141895286904, 20], [-0.3616636528028933, 1.9696512913275048, 20], [-0.19288728149487644, 2.1304391518440355, 20], [-0.024110910186859555, 2.30127625364285, 20], [0.09644364074743822, 2.472113355441664, 20], [0.19288728149487644, 2.311325494925133, 20], [0.28933092224231466, 2.1304391518440355, 20], [0.3857745629897529, 1.9797005326097878, 20], [0.4822182037371911, 1.8289619133755401, 20], [0.5304400241109102, 1.708371017988142, 20], [0.7233273056057866, 1.4269922620842126, 20], [0.7715491259795058, 1.3566475731082304, 20], [0.8679927667269439, 1.236056677720832, 20], [0.9162145871006631, 1.1858104713094162, 20], [0.9644364074743822, 1.1556627474625665, 20], [1.0126582278481013, 1.125515023615717, 20], [1.0608800482218204, 1.1154657823334337, 20], [1.0849909584086799, 1.1154657823334337, 20], [1.1332127787823991, 1.125515023615717, 20]]
const Points =   [[-4.258476136757559, 0.28175763374426016, 9.07080895036132], [-3.8649807315542377, 0.18554752023335672, 8.56266981690795], [-3.4883423201720705, 0.10480223890840223, 8.08891047631111], [-3.128560902611058, 0.039521789769396715, 7.649530928570795], [-2.7856364788712, -0.010293827183659843, 7.244531173687006], [-2.4595690489524964, -0.044644611950767465, 6.8739112116597445], [-2.1503586128549412, -0.06353056453192565, 6.537671042488985], [-1.6264308261380456, -0.06583954523711737, 5.847843843740165], [-1.367923879930732, -0.03380896762746308, 5.69849874589825], [-1.1498263252658425, 0.005965458124790411, 5.525162270019087], [-1.0267811617558196, 0.0401301286888582, 5.468741580322889], [-0.9450627600171285, 0.07007145988162604, 5.48827882913441], [-0.8747184192896051, 0.10082391507225984, 5.530745879753469], [-0.7993133548957851, 0.13336653836891588, 5.5301258113834235], [-0.7305305824113659, 0.16707803981748703, 5.52016416296257], [-0.6748929743087658, 0.2033208347147194, 5.552172130638052], [-0.6291924115244556, 0.24302781150407196, 5.618552514723114], [-0.5962482304451378, 0.2958292739582906, 5.82217956422924], [-0.5702885939559881, 0.3594419457524624, 6.116977211478688], [-0.54380529353574, 0.40928782038725314, 6.29912140652848], [-0.5370397408921875, 0.50339171834258, 6.816831051886478], [-0.5531967587645998, 0.6626642566885624, 7.816077732539652], [-0.5607619108325003, 0.8024188611278642, 8.6142990839231], [-0.5577462993657457, 0.9131834202526641, 9.217340345982876], [-0.5444731632364936, 0.9871923368064854, 9.582578312266927], [-0.5226770901754647, 1.0201855203838046, 9.690230109474847], [-0.49130527930473267, 1.0085492305954133, 9.549321844861193], [-0.4518099269348279, 0.9462243998175475, 9.143658754708856], [-0.40886114259066075, 0.8473220304533461, 8.593167738480975], [-0.3664097138842697, 0.7264781882427117, 7.9739559513705345], [-0.32310347365578773, 0.5924450894239242, 7.291303494593459], [-0.29505867606523745, 0.5193700502859223, 6.943025233624103], [-0.27209903911508754, 0.4563414141815214, 6.670302422015697], [-0.2542245628053388, 0.4033591811107228, 6.473135059768262], [-0.24143524713599107, 0.3604233510735264, 6.351523146881799], [-0.23373109210704457, 0.3275339240699324, 6.305466683356309], [-0.23111209771849922, 0.3046909000999407, 6.334965669191791]] 



const trajectoryPoints = Points.map(([x, y, z]) => [
  -x, // Flip x coordinate5
  -y+10,  // No change to y coordinate
  z+5, // Flip z coordinate
]);

function BallTrajectory() {
  const ballRef = useRef();
  let time = 0;

  useFrame(() => {
    time += 0.2;
    const index = Math.floor(time % trajectoryPoints.length);
    const nextIndex = (index + 1) % trajectoryPoints.length;

    const currentPoint = trajectoryPoints[index];
    const nextPoint = trajectoryPoints[nextIndex];
    const t = time % 1; // Interpolation factor between points

    if (ballRef.current) {
      // Interpolate between currentPoint and nextPoint
      ballRef.current.position.x = currentPoint[0] * (1 - t) + nextPoint[0] * t;
      ballRef.current.position.y = currentPoint[1] * (1 - t) + nextPoint[1] * t;
      ballRef.current.position.z = currentPoint[2] * (1 - t) + nextPoint[2] * t;
    }
  });

  return (
    <>
      {/* Draw the trajectory line */}
      <Line
        points={trajectoryPoints} // Array of points
        color="blue" // Line color
        lineWidth={5} // Line width
      />

      {/* Ball representing the moving object */}
      <mesh ref={ballRef} position={trajectoryPoints[0]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </>
  );
}

function Model(props) {
  const { scene } = useGLTF(modelPath) || {};
  if (!scene) return null; // Avoid errors if loading fails
  return <primitive {...props} object={scene} />;
}

function DebugCamera() {
  const { camera } = useThree();

  useFrame(() => {
    if (camera.position.y < 2) camera.position.y = 2;
  });

  return null;
}

function ErrorFallback({ error }) {
  return (
    <div style={{ color: 'red', padding: 20 }}>
      <h3>An error occurred:</h3>
      <pre>{error.message}</pre>
    </div>
  );
}

export default function App() {
  const cameraAxis = {
    x: -413.496820857545245,
    y: 21.974224970377211,
    z: 0.13412446635198547,
  };
  const orbitTarget = [5, 1, 0]; // Change the center of orbit here

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Canvas
        camera={{
          position: [cameraAxis.x, cameraAxis.y, cameraAxis.z],
          fov: 50,
        }}
      >
        <ambientLight />
        <Suspense fallback={null}>
          <Model />
        </Suspense>
        <OrbitControls
          makeDefault
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
          minDistance={1}
          maxDistance={20}
          enableZoom={true}
          target={orbitTarget}
        />
        <DebugCamera />
        <BallTrajectory />
      </Canvas>
    </ErrorBoundary>
  );
}
