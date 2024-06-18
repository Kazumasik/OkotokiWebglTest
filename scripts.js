import { fontInfo } from "./fontInfo";
import { WebGLUtils } from "./util";

const vertexShaderSource = `#version 300 es
precision mediump float;
in vec2 vertexPosition;
void main () {
  gl_Position = vec4(vertexPosition, 0.0, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform vec2 uCanvasSize;
out vec4 fragColor;
void main() {
  float alpha = gl_FragCoord.y / uCanvasSize.y;
  fragColor = vec4(0.671, 0.125, 0.204, alpha);
}`;

const lineFragmentShaderSource = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() {
  fragColor = vec4(0.925, 0.176, 0.361, 1.0);
}`;

const textVertexShader = `#version 300 es
in vec4 a_position;
in vec2 a_texcoord;
uniform mat4 u_matrix;
out vec2 v_texcoord;
void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = a_texcoord;
}`;

const textFragmentShader = `#version 300 es
precision mediump float;
in vec2 v_texcoord;
uniform sampler2D u_texture;
out vec4 outColor;
void main() {
  outColor = texture(u_texture, v_texcoord);
}`;

const webGLUtils = new WebGLUtils();
const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

let cryptoPrices = webGLUtils.generateRandomArray(500, 100);

const priceProgram = webGLUtils.getProgram(
  gl,
  vertexShaderSource,
  fragmentShaderSource
);
const lineProgram = webGLUtils.getProgram(
  gl,
  vertexShaderSource,
  lineFragmentShaderSource
);
const textProgram = webGLUtils.getProgram(
  gl,
  textVertexShader,
  textFragmentShader
);

const uCanvasSizeLocation = gl.getUniformLocation(priceProgram, "uCanvasSize");
gl.useProgram(priceProgram);
gl.uniform2f(uCanvasSizeLocation, canvas.width, canvas.height);

const vertexPositionLocation = gl.getAttribLocation(priceProgram, "vertexPosition");
const linePositionLocation = gl.getAttribLocation(lineProgram, "vertexPosition");

const positionAttributeLocation = gl.getAttribLocation(textProgram, "a_position");
const texcoordAttributeLocation = gl.getAttribLocation(textProgram, "a_texcoord");
const matrixLocation = gl.getUniformLocation(textProgram, "u_matrix");
const textureLocation = gl.getUniformLocation(textProgram, "u_texture");

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const positionBuffer = gl.createBuffer();
const texcoordBuffer = gl.createBuffer();

const triangleBuffer = gl.createBuffer();
const lineBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.enableVertexAttribArray(positionAttributeLocation);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
gl.enableVertexAttribArray(texcoordAttributeLocation);
gl.vertexAttribPointer(texcoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);

const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

const image = new Image();
image.src = "font.png";
image.onload = () => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
};

function drawCryptoLabel(cryptoLabel) {
  const scale = 0.6;
  const textWidth = cryptoLabel.split("").reduce((sum, letter) => {
    const glyphInfo = fontInfo.glyphInfos[letter];
    return sum + (glyphInfo ? glyphInfo.width + fontInfo.spacing : 0);
  }, 0) * scale;

  const textHeight = fontInfo.letterHeight * scale;
  const x = (canvas.width - textWidth) / 2;
  const y = (canvas.height - textHeight) / 2 - 30;

  webGLUtils.drawText(
    gl,
    textProgram,
    fontInfo,
    cryptoLabel,
    x,
    y,
    scale,
    positionBuffer,
    texcoordBuffer,
    matrixLocation,
    textureLocation
  );
}

function drawCryptoPrice(price, prevPrice) {
  const scale = 1.3;
  let priceText = `$` + price.toFixed(2);
  if (prevPrice < price) {
    priceText += "🠁";
  } else {
    priceText += "🠃";
  }

  const priceTextWidth = priceText.split("").reduce((sum, letter) => {
    const glyphInfo = fontInfo.glyphInfos[letter];
    return sum + (glyphInfo ? glyphInfo.width + fontInfo.spacing : 0);
  }, 0) * scale;

  const x = (canvas.width - priceTextWidth) / 2 - 25;
  const y = (canvas.height - fontInfo.letterHeight * scale) / 2 - 80;

  webGLUtils.drawText(
    gl,
    textProgram,
    fontInfo,
    priceText,
    x,
    y,
    scale,
    positionBuffer,
    texcoordBuffer,
    matrixLocation,
    textureLocation
  );
}

function drawGraph(triangleVertices, lineVertices) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height / 2.3);

  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(vertexPositionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertexPositionLocation);
  gl.useProgram(priceProgram);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, triangleVertices.length / 2);

  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(linePositionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(linePositionLocation);
  gl.useProgram(lineProgram);
  for (let i = 0; i < lineVertices.length / 8; i++) {
    gl.drawArrays(gl.TRIANGLE_STRIP, i * 4, 4);
  }
}

function animateGraph() {
  setTimeout(() => {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    cryptoPrices = webGLUtils.updateArray(cryptoPrices);
    drawCryptoLabel("binance/BNBUSDC");
    drawCryptoPrice(
      cryptoPrices[cryptoPrices.length - 1],
      cryptoPrices[cryptoPrices.length - 2]
    );

    const [triangleVertices, extendedPrices] = webGLUtils.generateTriangleCoords(cryptoPrices);
    const lineVertices = webGLUtils.generateLineCoords(extendedPrices, 8 / canvas.height);
    drawGraph(triangleVertices, lineVertices);

    requestAnimationFrame(animateGraph);
  }, 300);
}

animateGraph();

const fpsDisplay = document.querySelector("#fps");

let lastFrameTime = 0;
function renderFPS(now) {
  now *= 0.001;
  const deltaTime = now - lastFrameTime;
  lastFrameTime = now;
  const fps = 1 / deltaTime;
  fpsDisplay.textContent = fps.toFixed(1);
  requestAnimationFrame(renderFPS);
}
requestAnimationFrame(renderFPS);
