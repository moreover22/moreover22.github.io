let renderer, camera, scene, controls;

let sunModel, earthModel, moonModel, issModel, apolloModel;


let distanciaCam = 30;
let lastTargetPos = null;

let modelos = {
    "sol.dae": null,
    "apollo.dae": null,
    "iss.dae": null,
    "tierra.dae": null,
    "luna.dae": null,
}

let texturas = {
    "earth2.jpg": null,
    "sun.jpg": null,
    "moon2.jpg": null,
    "refmap1b.jpg": null,
}

let materiales;

let currentCameraTarget = 0;

let cameraTargets = [
    "sol.dae",
    "tierra.dae",
    "luna.dae",
    "iss.dae",
    "apollo.dae",
]

let lastRelCameraPositions = [null, null, null, null, null];


let speed = 1;

let earthTrail, moonTrail, issTrail;


function start() {

    // configuración básica de Three.js
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth - 5, window.innerHeight - 5);

    let aspect = window.innerWidth / window.innerHeight;

    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100000);
    camera.position.set(-80, 80, 80);
    //camera.lookAt(new THREE.Vector3(0,0,0));

    scene = new THREE.Scene();
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    document.getElementById('container3D').append(renderer.domElement);
    window.onresize = onResize;

    // Defino elementos de la escena

    let ambienLight = new THREE.AmbientLight(0x222266);
    scene.add(ambienLight);

    let light1 = new THREE.PointLight(0xFFEEEE, 1);
    light1.position.set(0, 0, 0);
    scene.add(light1);

    let gridHelper = new THREE.GridHelper(400, 20, new THREE.Color(0x666666), new THREE.Color(0x333333));
    scene.add(gridHelper);

    let axesHelper = new THREE.AxesHelper(8);
    scene.add(axesHelper);



    issTrail = new Trail(1000, new THREE.Vector3(0, 0, 0), 0.15);
    moonTrail = new Trail(1000, new THREE.Vector3(0, 0, 0), 0.45);
    earthTrail = new Trail(1000, new THREE.Vector3(0, 0, 0), 0.75);
}

function loadTextures() {

    let manager = new THREE.LoadingManager();

    manager.onStart = function (url, itemsLoaded, itemsTotal) {
        //console.log( 'Cargando textura: ' + url + '.\nCargadas ' + itemsLoaded + ' de ' + itemsTotal + ' texturas.' );
    };

    manager.onLoad = function () {
        console.log('Carga de texturas completa');
    };

    manager.onProgress = function (url, itemsLoaded, itemsTotal) {
        console.log('Cargando textura: ' + url + '.\nCargadas ' + itemsLoaded + ' de ' + itemsTotal + ' texturas.');
        if (itemsLoaded == itemsTotal) createScene();
    };

    manager.onError = function (url) {
        console.log('Hubo un error al cargar ' + url);
    };

    let filenames = Object.keys(texturas);

    for (let i = 0; i < filenames.length; i++) {
        let loader = new THREE.TextureLoader(manager);
        loader.load('maps/' + filenames[i], onTextureLoaded.bind(this, filenames[i]));
    }

}

function onTextureLoaded(file, texture) {
    console.log("onTextureLoaded " + file)
    texturas[file] = texture;
}

function createScene() {


    materiales = {
        "tierra": new THREE.MeshPhongMaterial({
            color: 0xFFFFFF,
            specular: 0xFFFFFF,
            shininess: 2,
            emissive: 0x222222,
            map: texturas["earth2.jpg"],

        }),
        "sol": new THREE.MeshPhongMaterial({
            color: 0xFFFFFF,
            shininess: 1,
            map: texturas["sun.jpg"],
            lightMap: texturas["sun.jpg"],

        }),
        "luna": new THREE.MeshPhongMaterial({
            color: 0xAAAAAA,
            emissive: 0x222222,
            shininess: 2,
            map: texturas["moon2.jpg"],

        }),
        "apollo": new THREE.MeshPhongMaterial({
            color: 0x666666,
            specular: 0x993300,
            emissive: 0x993300,
            shininess: 64,
            //envMap:texturas["refmap1b.jpg"],                
            side: THREE.DoubleSide
        }),
        "iss": new THREE.MeshPhongMaterial({
            color: 0x666666,
            specular: 0x999999,
            emissive: 0x333333,
            shininess: 64,
            //envMap:texturas["refmap1b.jpg"],                
            side: THREE.DoubleSide
        })
    };



    let manager = new THREE.LoadingManager();

    manager.onStart = function (url, itemsLoaded, itemsTotal) {
        console.log('Cargando modelo: ' + url + '.\nCargados ' + itemsLoaded + ' de ' + itemsTotal + ' modelos.');
    };

    manager.onLoad = function () {
        console.log('Carga de modelos completa');
    };

    manager.onProgress = function (url, itemsLoaded, itemsTotal) {
        console.log('Cargando archivo: ' + url + '.\nCargados ' + itemsLoaded + ' de ' + itemsTotal + ' modelos.');
        if (itemsLoaded == itemsTotal) onModelsLoaded();
    };

    manager.onError = function (url) {
        console.log('Hubo un error al cargar ' + url);

    };

    let filenames = Object.keys(modelos);

    for (let i = 0; i < filenames.length; i++) {
        let loader = new THREE.ColladaLoader(manager);
        loader.load('modelos/' + filenames[i], onModelLoaded.bind(this, filenames[i]));
    }

}

function onModelLoaded(filename, collada) {
    //console.log(collada.scene.children[0]);                  
    modelos[filename] = collada.scene.children[0];
    modelos[filename].rotation.set(0, 0, 0);
    modelos[filename].position.set(0, 0, 0);

    let escala = 3;
    switch (filename) {

        case "tierra.dae": escala = 15; break;
        case "luna.dae": escala = 7; break;
    }
    let axesHelper = new THREE.AxesHelper(escala);
    modelos[filename].add(axesHelper);
}

function toggleCam() {

    // guardo la posicion relativa de la camara al target
    let camPos = camera.position.clone();
    let targetPos = modelos[cameraTargets[currentCameraTarget]].localToWorld(new THREE.Vector3(0, 0, 0));
    let relCamPos = camPos.clone();
    relCamPos.sub(targetPos);
    lastRelCameraPositions[currentCameraTarget] = relCamPos;

    console.log("posicion relativa del target " + currentCameraTarget + ": ");
    console.log(relCamPos);

    // incremento currentCameraTarget
    if (currentCameraTarget < cameraTargets.length - 1) currentCameraTarget++;
    else currentCameraTarget = 0;

    if (lastRelCameraPositions[currentCameraTarget] != null) {
        let targetPos = modelos[cameraTargets[currentCameraTarget]].localToWorld(new THREE.Vector3(0, 0, 0));
        let p = lastRelCameraPositions[currentCameraTarget].clone();

        console.log("posicion relativa recuperada del " + currentCameraTarget + ": ");
        console.log(p);

        p.add(targetPos);
        camera.position.copy(p);
        controls.target.copy(targetPos);
    }

    lastTargetPos = null;
}

function onResize() {

    renderer.setSize(window.innerWidth - 5, window.innerHeight - 5);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

let trailsVisibles = true;

function toggleTrails() {
    trailsVisibles = !trailsVisibles;

    trailTierra.visible = trailsVisibles;
    trailLuna.visible = trailsVisibles;
    trailIss.visible = trailsVisibles;

}

function resetTrails() {
    earthTrail.reset();
    moonTrail.reset();
    issTrail.reset();
}

function onModelsLoaded() {

    document.addEventListener('keydown', function (e) {
        if (e.key == 'c') toggleCam();
        if (e.key == 't') toggleTrails();
        if (e.key == '+') {
            speed += 0.1;
            resetTrails();
        }
        if (e.key == '-') {
            speed -= +0.1;
            resetTrails();
        }
    });

    controls.update();
    /*
                sol = new THREE.Mesh(new THREE.SphereGeometry( 15, 32, 32 ), materiales["sol"] );
    */
    sunModel = modelos["sol.dae"];
    sunModel.material = materiales["sol"]

    scene.add(sunModel);

    earthModel = modelos["tierra.dae"];
    earthModel.material = materiales["tierra"]
    earthModel.position.x = 100;
    scene.add(earthModel);

    issModel = modelos["iss.dae"];
    issModel.material = materiales["iss"]
    issModel.position.x = 90;
    scene.add(issModel);

    moonModel = modelos["luna.dae"];
    moonModel.material = materiales["luna"]
    moonModel.position.x = 130;
    scene.add(moonModel);

    apolloModel = modelos["apollo.dae"];
    apolloModel.material = materiales["apollo"]
    apolloModel.position.x = 135;
    scene.add(apolloModel);


    render();
}

let frame = 0;
let tiempo = 0;
const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec4;

glMatrix.toRadian = (a) => a * Math.PI / 180;

function actualizarEscena() {

    /* *********************************************************************************

   Ejes de coordenadas y escalas
   -----------------------------

   La grilla esta definida en el plano XZ, el eje +Y es normal al plano.
   Cada celda de la grilla mida 20x20 unidades

   Consigna
   ---------
	
   Definir las matrices de transformacion de la Tierra, la Luna, la Estacion Espacial (ISS) y la nave Apollo, 
   para recrear los  movimientos reales de cada cuerpo.

   Condiciones a cumplir:
   ---------------------

   1) NO ESTA PERMITIDO el uso de funciones trigonometricas (seno y coseno) para el cálculo de las orbitas, 
      deben usar matrices de rotación y traslación para resolverlo

   2) La tierra rota alrededor del sol sobre el plano XZ (ciclo anual)
   3) La tierra tiene su eje inclinado de 23 grados respecto del eje +Y (arriba). 
   4) La tierra rota sobre su eje (ciclo del día)

   IMPORTANTE: tener en cuenta la relación de la inclinacion de 23 grados, con las estaciones del año
               ver imágenes en la carpeta img/ para mas detalles

   4) Rotación de la luna alrededor de la tierra (una vuelta cada 30 días y siempre expone la misma cara hacia la tierra)
   5) La nave Apolo debe estar ubicada sobre la cara oculta de la luna
   6) La ISS debe orbital alrededor de la tierra pasando por encima y por debajo de la misma

   La letiable tiempo, son los segundos desde que arranco la aplicación

   
   EDITAR EL CODIGO A CONTINUACION

   *********************************************************************************
   */
    const earthTranslationAngularSpeed = 2;
    const earthRotationAngularSpeed = 80;
    const earthSunDistance = 120;
    
    let earthTranslation = mat4.create();
    // tierra
    const earthInclinationAngle = -glMatrix.toRadian(23);
    mat4.rotateY(earthTranslation, earthTranslation, earthTranslationAngularSpeed * tiempo)
    mat4.translate(earthTranslation, earthTranslation, [earthSunDistance, 0, 0]);
    mat4.rotateY(earthTranslation, earthTranslation, -earthTranslationAngularSpeed * tiempo)
    
    let earth = mat4.clone(earthTranslation);
    
    
    mat4.rotateZ(earth, earth, earthInclinationAngle);
    mat4.rotateY(earth, earth, earthRotationAngularSpeed * tiempo);
    setTransform(earthModel, earth);
    

    // luna
    let moon = mat4.clone(earthTranslation);
    const earthMoonDistance = 30;
    const moonTranslationAngularSpeed = earthRotationAngularSpeed / 5;
    mat4.rotateY(moon, moon, moonTranslationAngularSpeed * tiempo)
    mat4.translate(moon, moon, [earthMoonDistance, 0, 0]);
    setTransform(moonModel, moon);

    // apollo
    let apollo = mat4.clone(moon);
    const apolloMoonDistance = 2;

    mat4.rotateZ(apollo, apollo, glMatrix.toRadian(30));
    mat4.translate(apollo, apollo, [apolloMoonDistance, 0, 0]);
    mat4.rotateZ(apollo, apollo, -glMatrix.toRadian(90));

    setTransform(apolloModel, apollo);

    // iss
    let iss = mat4.clone(earthTranslation);
    const earthISSDistance = 12;
    const issTranslationAngularSpeed = 60;
    mat4.rotateZ(iss, iss, tiempo * issTranslationAngularSpeed);
    mat4.translate(iss, iss, [earthISSDistance, 0, 0]);
    mat4.rotateY(iss, iss, glMatrix.toRadian(90));
    mat4.rotateX(iss, iss, -glMatrix.toRadian(30));
    setTransform(issModel, iss);


    // *********************************************************************************************

    if (earthTrail) earthTrail.pushPosition(earthModel.localToWorld(new THREE.Vector3(0, 0, 0)));
    if (moonTrail) moonTrail.pushPosition(moonModel.localToWorld(new THREE.Vector3(0, 0, 0)));
    if (issTrail) issTrail.pushPosition(issModel.localToWorld(new THREE.Vector3(0, 0, 0)));

    frame++;

}

function setTransform(obj, m1) {
    obj.position.set(0, 0, 0);
    obj.scale.set(1, 1, 1);
    obj.rotation.set(0, 0, 0);
    obj.updateMatrix();
    obj.applyMatrix(f(m1));
}

function f(m1) {

    let m2 = new THREE.Matrix4();
    m2.set(m1[0], m1[4], m1[8], m1[12],
        m1[1], m1[5], m1[9], m1[13],
        m1[2], m1[6], m1[10], m1[14],
        m1[3], m1[7], m1[11], m1[15]
    );

    return m2;

}


function updateCameras() {

    let tg = modelos[cameraTargets[currentCameraTarget]].localToWorld(new THREE.Vector3(0, 0, 0));
    controls.target.copy(tg);
    //console.log(t);
    controls.update();

    if (lastTargetPos != null) {
        delta = tg.clone();
        delta.sub(lastTargetPos);
        //console.log(delta);
        camera.position.add(delta);
    }
    lastTargetPos = tg;

}

function render() {

    requestAnimationFrame(render);
    updateCameras();

    actualizarEscena();

    tiempo += 0.1 * speed * 1 / 60;
    renderer.render(scene, camera, false, false);

    let displayContainer = document.getElementById('display')
    displayContainer.innerHTML = `speed: ${speed.toFixed(2)} <br>
                        camera target: ${cameraTargets[currentCameraTarget]}`;

}

start();
loadTextures();