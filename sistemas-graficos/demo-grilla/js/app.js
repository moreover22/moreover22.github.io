const vertexShaderFile = "shaders/vertex-shader.glsl";
const fragmentShaderFile = "shaders/fragment-shader.glsl";

var drawing_mode = "edges"; // wireframe, smooth, edges

let shaderProgram;
let time = 0;

let gl;
const mat4 = glMatrix.mat4;
const mat3 = glMatrix.mat3;
const vec3 = glMatrix.vec3;

let earth;

let $canvas = $("#myCanvas");
let aspect = $canvas.width() / $canvas.height();

var camera_distance = 3;
var camera_height = 2;
var angular_velocity = 0.3;
const surfaces = Object.keys(SURFACES);
var surface = surfaces[0];

let lighting = "true";

let vertexShaderSource;
let fragmentShaderSource;


function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl");
        gl.canvas.width = $canvas.width();
        gl.canvas.height = $canvas.height();
    } catch (e) {
        console.error(e);
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function loadShaders() {

    $.when(loadVS(), loadFS()).done(function(res1, res2) {
        //this code is executed when all ajax calls are done     
        webGLStart();
    });

    function loadVS() {
        return $.ajax({
            url: vertexShaderFile,
            success: result => vertexShaderSource = result
        });
    }

    function loadFS() {
        return $.ajax({
            url: fragmentShaderFile,
            success: result => fragmentShaderSource = result
        });
    }
}

function getShader(gl, code, type) {

    let shader;

    if (type == "fragment")
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    else // "vertex"
        shader = gl.createShader(gl.VERTEX_SHADER);

    gl.shaderSource(shader, code);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function onResize() {
    gl.canvas.width = $canvas.width();
    gl.canvas.height = $canvas.height();
    aspect = $canvas.width() / $canvas.height();
}

function getShaderSource(url) {
    let req = new XMLHttpRequest();
    req.open("GET", url, false);
    req.send(null);
    return (req.status == 200) ? req.responseText : null;
};

function initShaders() {

    let fragmentShader = getShader(gl, vertexShaderSource, "vertex");
    let vertexShader = getShader(gl, fragmentShaderSource, "fragment");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aUv");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mMatrixUniform = gl.getUniformLocation(shaderProgram, "uMMatrix");
    shaderProgram.vMatrixUniform = gl.getUniformLocation(shaderProgram, "uVMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
    shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
    shaderProgram.frameUniform = gl.getUniformLocation(shaderProgram, "time");
    shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
}

let matrizProyeccion = mat4.create();
let matrizVista = mat4.create();
let matrizModelado = mat4.create();

function setMatrixUniforms() {
    mat4.translate(matrizModelado, matrizModelado, [0.01, 0, 0])
    gl.uniformMatrix4fv(shaderProgram.mMatrixUniform, false, matrizModelado);
    gl.uniformMatrix4fv(shaderProgram.vMatrixUniform, false, matrizVista);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, matrizProyeccion);

    let normalMatrix = mat3.create();
    mat3.fromMat4(normalMatrix, matrizModelado); // normalMatrix= (inversa(traspuesta(matrizModelado)));

    mat3.invert(normalMatrix, normalMatrix);
    mat3.transpose(normalMatrix, normalMatrix);

    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function drawScene() {

    // Se configura el viewport dentro del "canvas". 
    // En este caso se utiliza toda el área disponible
    gl.viewport(0, 0, $canvas.width(), $canvas.height());

    // Se habilita el color de borrado para la pantalla (Color Buffer) y otros buffers
    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Se configura la matriz de proyección
    mat4.identity(matrizProyeccion);
    mat4.perspective(matrizProyeccion, 30, aspect, 0.1, 100.0);
    mat4.scale(matrizProyeccion, matrizProyeccion, [1, -1, 1]); // parche para hacer un flip de Y, parece haber un bug en glmatrix

    // Se inicializan las letiables asociadas con la Iluminación

    gl.uniform1f(shaderProgram.frameUniform, time / 10.0);
    gl.uniform3f(shaderProgram.ambientColorUniform, 0.1, 0.6, 0.1);
    gl.uniform3f(shaderProgram.directionalColorUniform, 0.7, 0.1, 0.7);
    gl.uniform1i(shaderProgram.useLightingUniform, (lighting == "true"));

    // Definimos la ubicación de la camara                        

    mat4.lookAt(matrizVista,
        vec3.fromValues(0, camera_height, camera_distance),
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(0, 1, 0)
    );

    let lightPosition = [-1, 0, 0];
    gl.uniform3fv(shaderProgram.lightingDirectionUniform, lightPosition);

    setMatrixUniforms();
    dibujarGeometria();

}

function tick() {
    requestAnimFrame(tick);
    time += 1 / 60;

    // acumulo rotaciones en matrizModelado		        
    mat4.rotate(matrizModelado, matrizModelado, 0.03 * angular_velocity, [0, 1, 0]);

    drawScene();
}

function initMenu() {
    let gui = new dat.GUI();
    gui.add(window, "camera_distance", 0.01, 5).step(0.01);
    gui.add(window, "camera_height", -4, 4).step(0.01);
    gui.add(window, "drawing_mode", ["wireframe", "smooth", "edges"]);
    gui.add(window, "angular_velocity", 0, 1).step(0.01);
    gui.add(window, "surface", surfaces).onChange(crearGeometria);

}

function webGLStart() {
    let canvas = document.getElementById("myCanvas");
    initGL(canvas);
    initShaders();


    crearGeometria();

    gl.clearColor(66.2, 0.2, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    $(window).on("resize", onResize);
    initMenu();
    tick();
}

$(document).ready(function() {

    loadShaders();

    var stats = new Stats();
    document.body.appendChild(stats.dom);
    requestAnimationFrame(function loop() {
        stats.update();
        requestAnimationFrame(loop)
    });
})