// asg4.js
// Nicholas Powell

const VSHADER_SOURCE = `
precision mediump float;
attribute vec4 a_Position;
attribute vec2 a_UV;
attribute vec3 a_Normal;

varying vec2 v_UV;
varying vec3 v_Normal;
varying vec4 v_VertPos;

uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

void main() {
    gl_Position = u_ProjectionMatrix 
                  * u_ViewMatrix
                  * u_GlobalRotateMatrix
                  * u_ModelMatrix
                  * a_Position;

    v_UV = a_UV;
    v_Normal = a_Normal;
    v_VertPos = u_ModelMatrix * a_Position;
}
`;

const FSHADER_SOURCE = `
precision mediump float;

varying vec2 v_UV;
varying vec3 v_Normal;
varying vec4 v_VertPos;

uniform vec4 u_FragColor;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform int u_whichTexture;
uniform int u_showNormal;

uniform vec3 u_lightPos;
uniform vec3 u_cameraPos;
uniform vec3 u_lightColor;
uniform int u_light;
uniform int u_light1;

uniform int u_spotLightOn;
uniform vec3 u_spotLightDir;
uniform float u_spotLightCutoff;

void main() {
    vec4 baseColor;
    if (u_showNormal == 1) {
        baseColor = vec4((normalize(v_Normal) + 1.0)*0.5, 1.0);
    } else {
        if (u_whichTexture == -2) {
            baseColor = u_FragColor;
        } else if (u_whichTexture == -1) {
            baseColor = vec4(v_UV, 1.0, 1.0);
        } else if (u_whichTexture == 1) {
            baseColor = texture2D(u_Sampler1, v_UV);
        } else if (u_whichTexture == 2) {
            baseColor = texture2D(u_Sampler2, v_UV);
        }
         else {
            baseColor = vec4(1.0, 0.2, 0.2, 1.0);
        }
    }

    if (u_light == 0) {
        gl_FragColor = baseColor;
        return;
    }

    vec3 N = normalize(v_Normal);
    vec3 L = normalize(u_lightPos - vec3(v_VertPos));
    float nDotL = max(dot(N, L), 0.0);

    vec3 ambient = 0.3 * baseColor.rgb;

    vec3 diffuse = baseColor.rgb * nDotL;

    vec3 R = reflect(-L, N);
    vec3 E = normalize(u_cameraPos - vec3(v_VertPos));
    float spec = pow(max(dot(E, R), 0.0), 100.0);

    vec3 totalColor = ambient + diffuse + spec;

    if (u_light1 == 1) {
        totalColor *= u_lightColor;
    }

    if (u_spotLightOn == 1) {
        vec3 L2 = normalize(u_lightPos - vec3(v_VertPos));
        float spotFactor = dot(L2, -normalize(u_spotLightDir));

        if (spotFactor > u_spotLightCutoff) {
            float nDotL2 = max(dot(N, L2), 0.0);
            vec3 amb2 = 0.2 * baseColor.rgb; 
            vec3 diff2 = baseColor.rgb * nDotL2;
            vec3 R2 = reflect(-L2, N);
            float spec2 = pow(max(dot(E, R2), 0.0), 100.0);
            vec3 spotColor = amb2 + diff2 + spec2;

            if (u_light1 == 1) {
                spotColor *= u_lightColor;
            }
            totalColor += spotColor;
        }
    }
    gl_FragColor = vec4(totalColor, baseColor.a);
}
`;

let worldCanvas;
let worldGL;

let worldCamera;

let a_Position, a_UV, a_Normal;
let u_FragColor;
let u_ModelMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_GlobalRotateMatrix;
let u_whichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2;
let g_lightOn = true;

let u_showNormal;
let g_showNormal = false;

let u_lightPos,    g_lightPos    = [2.0, 2.0, 2.0];
let u_lightColor,  g_lightColor  = [1.0, 1.0, 1.0];
let g_sliderLightPos = [2.0, 2.0, 2.0];  
let g_lightMoveOn = false; 
let u_cameraPos;
let u_light;
let u_light1;
let g_spotLightOn = false;
let g_spotLightDir = [0.0, -1.0, 0.0];
let g_spotLightCutoff = 0.7;
let u_spotLightOn;
let u_spotLightDir;
let u_spotLightCutoff;

let globalRotX = 0;
let globalRotY = 0;
let globalRotZ = 0;

let initialTime = performance.now() / 1000.0;
let timeElapsed = 0.0;

function main() {
    worldCanvas = document.getElementById('webgl');
    worldGL = worldCanvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!worldGL) {
        console.error('Failed to get WebGL context');
        return;
    }

    worldGL.enable(worldGL.DEPTH_TEST);
    worldGL.disable(worldGL.CULL_FACE);
    worldGL.clearColor(0.0, 0.0, 0.0, 1.0);

    if (!initShaders(worldGL, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.error('Failed to initialize shaders.');
        return;
    }

    connectVariablesToGLSL();

    worldCamera = new Camera(worldCanvas);

    setupTextures();
    setupLightSliders();
    setupLightColorSliders();
    requestAnimationFrame(tick);

    document.onclick = handleKeyPress;
    document.onkeydown = handleKeyPress;
    initializeMouseDrag(worldCanvas);

    requestAnimationFrame(tick);
}

function setupLightSliders() {
    const xSlider = document.getElementById('lightXSlider');
    const ySlider = document.getElementById('lightYSlider');
    const zSlider = document.getElementById('lightZSlider');

    xSlider.oninput = function() {
        g_sliderLightPos[0] = parseFloat(xSlider.value);
        renderAllShapes();
    };
    ySlider.oninput = function() {
        g_sliderLightPos[1] = parseFloat(ySlider.value);
        renderAllShapes();
    };
    zSlider.oninput = function() {
        g_sliderLightPos[2] = parseFloat(zSlider.value);
        renderAllShapes();
    };
}


function connectVariablesToGLSL() {
    a_Position = worldGL.getAttribLocation(worldGL.program, 'a_Position');
    a_UV       = worldGL.getAttribLocation(worldGL.program, 'a_UV');
    a_Normal   = worldGL.getAttribLocation(worldGL.program, 'a_Normal');

    u_FragColor          = worldGL.getUniformLocation(worldGL.program, 'u_FragColor');
    u_ModelMatrix        = worldGL.getUniformLocation(worldGL.program, 'u_ModelMatrix');
    u_ProjectionMatrix   = worldGL.getUniformLocation(worldGL.program, 'u_ProjectionMatrix');
    u_ViewMatrix         = worldGL.getUniformLocation(worldGL.program, 'u_ViewMatrix');
    u_GlobalRotateMatrix = worldGL.getUniformLocation(worldGL.program, 'u_GlobalRotateMatrix');
    u_whichTexture       = worldGL.getUniformLocation(worldGL.program, 'u_whichTexture');
    
    u_Sampler0           = worldGL.getUniformLocation(worldGL.program, 'u_Sampler0');
    u_Sampler1           = worldGL.getUniformLocation(worldGL.program, 'u_Sampler1');
    u_Sampler2           = worldGL.getUniformLocation(worldGL.program, 'u_Sampler2');

    u_showNormal         = worldGL.getUniformLocation(worldGL.program, 'u_showNormal');

    u_lightPos     = worldGL.getUniformLocation(worldGL.program, 'u_lightPos');
    u_lightColor   = worldGL.getUniformLocation(worldGL.program, 'u_lightColor');
    u_cameraPos    = worldGL.getUniformLocation(worldGL.program, 'u_cameraPos');
    u_light        = worldGL.getUniformLocation(worldGL.program, 'u_light');
    u_light1       = worldGL.getUniformLocation(worldGL.program, 'u_light1');
    u_spotLightOn   = worldGL.getUniformLocation(worldGL.program, 'u_spotLightOn');
    u_spotLightDir  = worldGL.getUniformLocation(worldGL.program, 'u_spotLightDir');
    u_spotLightCutoff = worldGL.getUniformLocation(worldGL.program, 'u_spotLightCutoff');

    let identityMatrix = new Matrix4();
    worldGL.uniformMatrix4fv(u_ModelMatrix, false, identityMatrix.elements);
}

function toggleLight() {
    g_lightOn = !g_lightOn;
    renderAllShapes();
}

function toggleLightAnimation() {
    g_lightMoveOn = !g_lightMoveOn;
}

function toggleSpotLight() {
  g_spotLightOn = !g_spotLightOn;
  renderAllShapes();
}

function setupLightColorSliders() {
    const rSlider = document.getElementById('lightRSlider');
    const gSlider = document.getElementById('lightGSlider');
    const bSlider = document.getElementById('lightBSlider');

    rSlider.oninput = function() {
        g_lightColor[0] = parseFloat(rSlider.value);
        renderAllShapes();
    };
    gSlider.oninput = function() {
        g_lightColor[1] = parseFloat(gSlider.value);
        renderAllShapes();
    };
    bSlider.oninput = function() {
        g_lightColor[2] = parseFloat(bSlider.value);
        renderAllShapes();
    };
}

function setupTextures() {
    let img0 = new Image();
    let img1 = new Image();
    let img2 = new Image();

    img0.onload = () => sendTexToGL(img0, 0);
    img1.onload = () => sendTexToGL(img1, 1);
    img2.onload = () => sendTexToGL(img2, 2);

    img0.src = 'texture0.png';
    img1.src = 'sky.png';
    img2.src = 'grass.png';
}

function sendTexToGL(img, unitIndex) {
    let tex = worldGL.createTexture();
    if (!tex) {
        console.error('Failed to create tex for unit', unitIndex);
        return;
    }
    worldGL.pixelStorei(worldGL.UNPACK_FLIP_Y_WEBGL, 1);
    worldGL.activeTexture(worldGL[`TEXTURE${unitIndex}`]);
    worldGL.bindTexture(worldGL.TEXTURE_2D, tex);
    worldGL.texParameteri(worldGL.TEXTURE_2D, worldGL.TEXTURE_MIN_FILTER, worldGL.LINEAR);
    worldGL.texImage2D(worldGL.TEXTURE_2D, 0, worldGL.RGB, worldGL.RGB, worldGL.UNSIGNED_BYTE, img);

    if (unitIndex === 0) {
        worldGL.uniform1i(u_Sampler0, 0);
    } else if (unitIndex === 1) {
        worldGL.uniform1i(u_Sampler1, 1);
    } else if (unitIndex === 2) {
        worldGL.uniform1i(u_Sampler2, 2);
    }
}

function tick() {
    timeElapsed = performance.now() / 1000.0 - initialTime;

    if (g_lightMoveOn) {
        let amplitude = 2.0;
        let angle = timeElapsed * 0.5;
        g_lightPos[0] = g_sliderLightPos[0];
        g_lightPos[1] = g_sliderLightPos[1] + amplitude * Math.sin(angle);
        g_lightPos[2] = g_sliderLightPos[2] + amplitude * Math.cos(angle);
    } else {
        g_lightPos[0] = g_sliderLightPos[0];
        g_lightPos[1] = g_sliderLightPos[1];
        g_lightPos[2] = g_sliderLightPos[2];
    }

    renderAllShapes();
    requestAnimationFrame(tick);
}

function toggleNormalVisualization() {
    g_showNormal = !g_showNormal;
}

function renderAllShapes() {
    worldGL.clear(worldGL.COLOR_BUFFER_BIT | worldGL.DEPTH_BUFFER_BIT);
    worldGL.uniform1i(u_showNormal, g_showNormal ? 1 : 0);
    worldGL.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    worldGL.uniform1i(u_spotLightOn, g_spotLightOn ? 1 : 0);
    worldGL.uniform3f(u_spotLightDir, g_spotLightDir[0], g_spotLightDir[1], g_spotLightDir[2]);
    worldGL.uniform1f(u_spotLightCutoff, g_spotLightCutoff);
    worldGL.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
    worldGL.uniform3f(u_cameraPos, worldCamera.eye.elements[0], worldCamera.eye.elements[1], worldCamera.eye.elements[2]);
    worldGL.uniform1i(u_light, g_lightOn ? 1 : 0);
    worldGL.uniform1i(u_light1, 1);

    let projectionMatrix = new Matrix4();
    projectionMatrix.setPerspective(90, worldCanvas.width / worldCanvas.height, 0.1, 150.0);
    worldGL.uniformMatrix4fv(u_ProjectionMatrix, false, projectionMatrix.elements);

    worldGL.uniformMatrix4fv(u_ViewMatrix, false, worldCamera.viewMatrix.elements);

    let globalMatrix = new Matrix4();
    globalMatrix.rotate(globalRotX, 1,0,0);
    globalMatrix.rotate(globalRotY, 0,1,0);
    globalMatrix.rotate(globalRotZ, 0,0,1);
    worldGL.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalMatrix.elements);
    {
        let ground = new Cube();
        ground.textureNum = 2;
        ground.matrix.translate(-4, -0.75, -4);
        ground.matrix.scale(32, 0.01, 32);
        ground.drawCube();
    }
    {
        let sky = new Cube();
        sky.textureNum = 1;
        sky.matrix.translate(-1, 0, -1);
        sky.matrix.scale(100,100,100);
        sky.matrix.translate(-0.5,-0.5,-0.5);
        sky.drawCube();
    }
    {
        let ball = new Sphere({ radius: 1.0, latSegments: 20, longSegments: 20 });
        ball.textureNum = -2;
        ball.baseColor = [1.0, 0.0, 0.0, 1.0];
        ball.matrix.translate(0, -0.25, 0);
        ball.matrix.scale(0.5, 0.5, 0.5);
        ball.drawSphere();
    }
    {
        let lightCube = new Cube();
        lightCube.textureNum = -2;
        lightCube.baseColor = [1,1,0,1];
        lightCube.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
        lightCube.matrix.scale(0.1,0.1,0.1);
        lightCube.drawCube();
    }

    let frameTime = Math.round(performance.now() - (timeElapsed + initialTime)*1000);
    let fps = frameTime ? (1000 / frameTime).toFixed(1) : '...';
    updateHTMLStats(`FrameTime: ${frameTime} ms | fps: ${fps}`);
}

function handleKeyPress(ev) {
    switch(ev.keyCode) {
        case 87:
            worldCamera.moveForward();
            break;
        case 83:
            worldCamera.moveBackward();
            break;
        case 65:
            worldCamera.moveLeft();
            break;
        case 68:
            worldCamera.moveRight();
            break;
        case 81:
            worldCamera.panLeft();
            break;
        case 69:
            worldCamera.panRight();
            break;
        case 79:
            worldCamera.lookUp();
            break;
        case 80:
            worldCamera.lookDown();
            break;
        default:
            break;
    }
    renderAllShapes();
}

function initializeMouseDrag(canvasElement) {
    let isDragging = false;
    let lastX = -1, lastY = -1;

    const startDrag = (x,y) => {
        let rect = canvasElement.getBoundingClientRect();
        if(rect.left<=x && x<rect.right && rect.top<=y && y<rect.bottom){
            isDragging = true;
            lastX = x;
            lastY = y;
        }
    };
    const moveDrag = (x,y) => {
        if(isDragging) {
            let factor = 0.3;
            let dx = factor*(x - lastX);
            let dy = factor*(y - lastY);
            globalRotY -= dx;
            globalRotX -= dy;
            globalRotX = Math.max(Math.min(globalRotX, 90), -90);
            lastX=x; lastY=y;
        }
    };
    const endDrag = () => { isDragging = false; };

    canvasElement.onmousedown   = (e)=>{ startDrag(e.clientX,e.clientY); };
    canvasElement.onmousemove   = (e)=>{ moveDrag(e.clientX,e.clientY); };
    canvasElement.onmouseup     = endDrag;
    canvasElement.onmouseleave  = endDrag;
}

function updateHTMLStats(txt) {
    let fpsElement = document.getElementById('fps');
    if (fpsElement) {
        fpsElement.innerHTML = txt;
    }
}
function updateStatusMessage(msg) {
    let msgElem = document.getElementById('statusMessage');
    if (msgElem) {
        msgElem.innerHTML = msg;
    }
}