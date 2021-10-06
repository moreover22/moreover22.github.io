/*

    Tareas:
    ------

    1) Modificar a función "generarSuperficie" para que tenga en cuenta los 
    parametros filas y columnas al llenar el indexBuffer
       Con esta modificación deberían poder generarse planos de N filas por M columnas

    2) Modificar la funcion "dibujarMalla" para que use la primitiva "triangle_strip"

    3) Crear nuevos tipos funciones constructoras de superficies

        3a) Crear la función constructora "Esfera" que reciba como parámetro el radio

        3b) Crear la función constructora "TuboSenoidal" que reciba como parámetro la amplitud de onda, longitud de onda, radio del tubo y altura.
        (Ver imagenes JPG adjuntas)
        
        
    Entrega:
    -------

    - Agregar una variable global que permita elegir facilmente que tipo de primitiva se desea visualizar [plano,esfera,tubosenoidal]
    
*/


var superficie3D;
var mallaDeTriangulos;

var filas = 100;
var columnas = 100;


class PlaneSurface {
    constructor(width, height) {
        this.width = width
        this.height = height
    }

    getPosition(u, v) {
        const x = (u - 0.5) * this.width;
        const z = (v - 0.5) * this.height;
        return [x, 0, z];
    }

    getNormal(u, v) {
        return [0, 1, 0];
    }

    getTextureCoordinates(u, v) {
        return [u, v];
    }
}

class SphereSurface {
    constructor(radius) {
        this.radius = radius
    }

    getPosition(u, v) {
        const theta = u * Math.PI;
        const phi = v * 2 * Math.PI;
        const x = this.radius * Math.sin(theta) * Math.cos(phi)
        const y = this.radius * Math.sin(theta) * Math.sin(phi)
        const z = this.radius * Math.cos(theta)
        return [x, y, z];
    }

    getNormal(u, v) {
        const theta = u * Math.PI;
        const phi = v * 2 * Math.PI;
        const x = Math.sin(theta) * Math.cos(phi)
        const y = Math.sin(theta) * Math.sin(phi)
        const z = Math.cos(theta)
        return [x, y, z];
    }

    getTextureCoordinates(u, v) {
        const pseudo_shade = this.getNormal(u, v)
        return [pseudo_shade[0], pseudo_shade[1]];
    }
}

class TubeSurface {
    constructor(radius, height) {
        this.radius = radius
        this.height = height
    }

    getPosition(u, v) {
        let phi = u * 2 * Math.PI;
        let x = this.radius * Math.cos(phi)
        let y = this.radius * Math.sin(phi)
        let z = this.height * v
        return [x, y, z];
    }

    getNormal(u, v) {
        const phi = v * 2 * Math.PI;
        const x = Math.cos(phi)
        const y = Math.sin(phi)
        const z = 0
        return [x, y, z];
    }

    getTextureCoordinates(u, v) {
        const pseudo_shade = this.getNormal(u, v)
        return [pseudo_shade[0], pseudo_shade[1]];
    }
}

class WavedTubeSurface {
    constructor(radius, height, period, amplitude) {
        this.radius = radius
        this.height = height
        this.period = period
        this.amplitude = amplitude
    }

    getPosition(u, v) {
        const phi = u * 2 * Math.PI
        const theta = v * Math.PI
        const wave_amplitude = Math.sin(theta / this.period) * this.amplitude
        const waved_radius = this.radius + wave_amplitude
        const x = waved_radius * Math.cos(phi)
        const y = waved_radius * Math.sin(phi)
        const z = this.height * v
        return [x, y, z];
    }

    getNormal(u, v) {
        const phi = u * 2 * Math.PI
        const theta = v * Math.PI
        const wave_amplitude_derived = this.amplitude * Math.cos(theta / this.period) / this.period
        const cross_prod_derivatives_norm = Math.sqrt(Math.pow(this.height / Math.PI, 2) +
            Math.pow(wave_amplitude_derived, 2))
        const x = -Math.cos(phi) * this.height / Math.PI / cross_prod_derivatives_norm
        const y = -Math.sin(phi) * this.height / Math.PI / cross_prod_derivatives_norm
        const z = wave_amplitude_derived / cross_prod_derivatives_norm
        return [x, y, z];
    }

    getTextureCoordinates(u, v) {
        const pseudo_shade = this.getNormal(u, v)
        return [pseudo_shade[2], pseudo_shade[0]];
    }
}

let SURFACES = {
    'Plano': new PlaneSurface(3, 3),
    'Esfera': new SphereSurface(1.5),
    'Tubo': new TubeSurface(1, 8),
    'Tubo ondulado': new WavedTubeSurface(1, 3, 0.1, 0.15),
}

function crearGeometria() {
    superficie3D = SURFACES[surface];
    mallaDeTriangulos = generate_surface(superficie3D, filas, columnas);
}

function dibujarGeometria() {
    dibujarMalla(mallaDeTriangulos);
}



function generate_surface(surface, rows, columns) {

    let { positionBuffer, normalBuffer, uvBuffer } = generate_surface_buffers(rows, columns, surface);

    let indexBuffer = generate_index_buffer(columns, rows);

    return generate_wbgl_buffers(positionBuffer, normalBuffer, uvBuffer, indexBuffer);
}

function generate_surface_buffers(rows, columns, surface) {
    let positionBuffer = [];
    let normalBuffer = [];
    let uvBuffer = [];

    for (let i = 0; i <= rows; i++) {
        for (let j = 0; j <= columns; j++) {

            let u = j / columns;
            let v = i / rows;

            positionBuffer.push(...surface.getPosition(u, v));
            normalBuffer.push(...surface.getNormal(u, v));
            uvBuffer.push(...surface.getTextureCoordinates(u, v));
        }
    }
    return { positionBuffer, normalBuffer, uvBuffer };
}

function generate_wbgl_buffers(positionBuffer, normalBuffer, uvBuffer, indexBuffer) {
    let webgl_position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, webgl_position_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionBuffer), gl.STATIC_DRAW);
    webgl_position_buffer.itemSize = 3;
    webgl_position_buffer.numItems = positionBuffer.length / 3;

    let webgl_normal_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, webgl_normal_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalBuffer), gl.STATIC_DRAW);
    webgl_normal_buffer.itemSize = 3;
    webgl_normal_buffer.numItems = normalBuffer.length / 3;

    let webgl_uvs_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, webgl_uvs_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvBuffer), gl.STATIC_DRAW);
    webgl_uvs_buffer.itemSize = 2;
    webgl_uvs_buffer.numItems = uvBuffer.length / 2;


    let webgl_index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webgl_index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexBuffer), gl.STATIC_DRAW);
    webgl_index_buffer.itemSize = 1;
    webgl_index_buffer.numItems = indexBuffer.length;

    return {
        webgl_position_buffer,
        webgl_normal_buffer,
        webgl_uvs_buffer,
        webgl_index_buffer
    };
}

function generate_index_buffer(columns, rows) {
    let indexBuffer = [];
    const vertices_columns = columns + 1;
    const total_traversed_vertices = rows * vertices_columns;

    for (let i = 0; i < total_traversed_vertices; i++) {

        indexBuffer.push(i);
        indexBuffer.push(i + vertices_columns);

        if (i > 0 && i + 1 % vertices_columns == 0) {
            indexBuffer.push(i + vertices_columns);
            indexBuffer.push(i + 1);
        }
    }
    return indexBuffer;
}

function dibujarMalla(mallaDeTriangulos) {

    // Se configuran los buffers que alimentaron el pipeline
    gl.bindBuffer(gl.ARRAY_BUFFER, mallaDeTriangulos.webgl_position_buffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mallaDeTriangulos.webgl_position_buffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, mallaDeTriangulos.webgl_uvs_buffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, mallaDeTriangulos.webgl_uvs_buffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, mallaDeTriangulos.webgl_normal_buffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mallaDeTriangulos.webgl_normal_buffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mallaDeTriangulos.webgl_index_buffer);


    if (drawing_mode != "wireframe") {
        gl.uniform1i(shaderProgram.useLightingUniform, (lighting == "true"));
        gl.drawElements(gl.TRIANGLE_STRIP, mallaDeTriangulos.webgl_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    if (drawing_mode != "smooth") {
        gl.uniform1i(shaderProgram.useLightingUniform, false);
        gl.drawElements(gl.LINE_STRIP, mallaDeTriangulos.webgl_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

}