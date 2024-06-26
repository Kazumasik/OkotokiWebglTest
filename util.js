export class WebGLUtils {
  getShader = (gl, shaderSource, shaderType) => {
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  getProgram = (gl, vertexShaderSource, fragmentShaderSource) => {
    var vs = this.getShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    var fs = this.getShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
    }
    return program;
  };

  createAndBindBuffer = (gl, bufferType, typeOfDrawing, data) => {
    var buffer = gl.createBuffer();
    gl.bindBuffer(bufferType, buffer);
    gl.bufferData(bufferType, data, typeOfDrawing);
    return buffer;
  };

  createAndBindTexture = (gl, image) => {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  };

  linkGPUAndCPU = (obj, gl) => {
    var position = gl.getAttribLocation(obj.program, obj.gpuVariable);
    gl.enableVertexAttribArray(position);
    gl.bindBuffer(obj.channel || gl.ARRAY_BUFFER, obj.buffer);
    gl.vertexAttribPointer(
      position,
      obj.dims,
      obj.dataType || gl.FLOAT,
      obj.normalize || gl.FALSE,
      obj.stride || 0,
      obj.offset || 0
    );
    return position;
  };

  generateLineCoords = (heights, lineWidth) => {
    const lineCoords = [];
    const xStep = 2.0 / (heights.length - 1);
    const halfWidth = lineWidth / 2;
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);

    for (let i = 0; i < heights.length - 1; i++) {
      const x1 = -1.0 + i * xStep;
      const y1 = ((heights[i] - minHeight) / (maxHeight - minHeight)) * 2 - 1;
      const x2 = x1 + xStep;
      const y2 =
        ((heights[i + 1] - minHeight) / (maxHeight - minHeight)) * 2 - 1;

      const angle = Math.atan2(y2 - y1, x2 - x1);
      const sin = Math.sin(angle) * halfWidth;
      const cos = Math.cos(angle) * halfWidth;

      lineCoords.push(x1 - sin, y1 + cos);
      lineCoords.push(x1 + sin, y1 - cos);
      lineCoords.push(x2 - sin, y2 + cos);
      lineCoords.push(x2 + sin, y2 - cos);
    }

    return lineCoords;
  };
  generateTriangleCoords = (heights, smoothCorners = false) => {
    let extendedHeights = [];

    if (smoothCorners) {
      for (let i = 0; i < heights.length - 1; i++) {
        let currentHeight = heights[i];
        let nextHeight = heights[i + 1];
        let middleHeight = nextHeight - currentHeight;

        middleHeight =
          nextHeight > currentHeight
            ? middleHeight * 0.7
            : middleHeight - middleHeight * 0.7;

        extendedHeights.push(currentHeight);
        extendedHeights.push(middleHeight + currentHeight);
      }
      extendedHeights.push(heights[heights.length - 1]);
    } else {
      extendedHeights = heights;
    }

    const minHeight = Math.min(...extendedHeights);
    const maxHeight = Math.max(...extendedHeights);
    const normalizedHeights = extendedHeights.map(
      (height) => ((height - minHeight) / (maxHeight - minHeight)) * 2 - 1
    );

    const triangleCoords = [];
    let xCoord = -1.0;
    const xStep = 2.0 / (normalizedHeights.length - 1);

    for (let i = 0; i < normalizedHeights.length; i++) {
      triangleCoords.push(xCoord, -1.0);
      triangleCoords.push(xCoord, normalizedHeights[i]);
      xCoord += xStep;
    }

    return [triangleCoords, extendedHeights];
  };
  orthographic = (left, right, bottom, top, near, far, dst) => {
    dst = dst || new Float32Array(16);

    dst[0] = 2 / (right - left);
    dst[1] = 0;
    dst[2] = 0;
    dst[3] = 0;
    dst[4] = 0;
    dst[5] = 2 / (top - bottom);
    dst[6] = 0;
    dst[7] = 0;
    dst[8] = 0;
    dst[9] = 0;
    dst[10] = 2 / (near - far);
    dst[11] = 0;
    dst[12] = (left + right) / (left - right);
    dst[13] = (bottom + top) / (bottom - top);
    dst[14] = (near + far) / (near - far);
    dst[15] = 1;

    return dst;
  };
  drawText = (
    gl,
    program,
    fontInfo,
    text,
    x,
    y,
    scale,
    positionBuffer,
    texcoordBuffer,
    matrixLocation,
    textureLocation
  ) => {
    const positions = [];
    const texcoords = [];
    let offsetX = x;

    for (const letter of text) {
      const glyphInfo = fontInfo.glyphInfos[letter];
      if (glyphInfo) {
        const x2 = offsetX + glyphInfo.width * scale;
        const y2 = y + fontInfo.letterHeight * scale;

        positions.push(
          offsetX,
          y,
          x2,
          y,
          offsetX,
          y2,
          offsetX,
          y2,
          x2,
          y,
          x2,
          y2
        );

        const u1 = glyphInfo.x / fontInfo.textureWidth;
        const v1 = glyphInfo.y / fontInfo.textureHeight;
        const u2 = (glyphInfo.x + glyphInfo.width) / fontInfo.textureWidth;
        const v2 =
          (glyphInfo.y + fontInfo.letterHeight) / fontInfo.textureHeight;

        texcoords.push(u1, v1, u2, v1, u1, v2, u1, v2, u2, v1, u2, v2);

        offsetX += (glyphInfo.width + fontInfo.spacing) * scale;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

    gl.useProgram(program);

    const projectionMatrix = this.orthographic(
      0,
      gl.canvas.width,
      gl.canvas.height,
      0,
      -1,
      1
    );
    gl.uniformMatrix4fv(matrixLocation, false, projectionMatrix);
    gl.uniform1i(textureLocation, 0);

    this.linkGPUAndCPU(
      {
        program: program,
        gpuVariable: "a_position",
        buffer: positionBuffer,
        dims: 2,
      },
      gl
    );

    this.linkGPUAndCPU(
      {
        program: program,
        gpuVariable: "a_texcoord",
        buffer: texcoordBuffer,
        dims: 2,
      },
      gl
    );

    gl.drawArrays(gl.TRIANGLES, 0, text.length * 6);
  };
  generateRandomArray = (startValue, count) => {
    const result = [startValue];

    for (let i = 1; i < count; i++) {
      const prevValue = result[i - 1];
      const changePercent = Math.random() * 0.01;
      const changeDirection = Math.random() < 0.5 ? -1 : 1;
      const changeAmount = prevValue * changePercent * changeDirection;
      const newValue = prevValue + changeAmount;

      result.push(newValue);
    }

    return result;
  };
  updateArray = (arr) => {
    const newArray = [];
    for (let i = 1; i < arr.length; i++) {
      newArray.push(arr[i]);
    }

    const prevValue = arr[arr.length - 1];
    const changePercent = Math.random() * 0.01;
    const changeDirection = Math.random() < 0.5 ? -1 : 1;
    const changeAmount = prevValue * changePercent * changeDirection;
    const newValue = +(prevValue + changeAmount).toFixed(2);

    newArray.push(newValue);
    return newArray;
  };
}
