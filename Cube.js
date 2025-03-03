// Cube.js
class Cube {
  constructor() {
    this.matrix = new Matrix4();
    this.textureNum = -2;  // default texture index

    // Initialize shared geometry/buffers once
    Cube._initCubeGeometry();
  }

  static _initCubeGeometry() {
    // If buffers are already created, skip
    if (Cube.positionBuffer) return;

    // Each face has 2 triangles, 3 vertices each => 6 verts
    // 6 faces => 36 total
    const positions = new Float32Array([
      // Front face  (z=0)
      0,0,0,   1,0,0,   1,1,0,
      0,0,0,   1,1,0,   0,1,0,

      // Back face   (z=1)
      1,0,1,   0,0,1,   0,1,1,
      1,0,1,   0,1,1,   1,1,1,

      // Left face   (x=0)
      0,0,1,   0,0,0,   0,1,0,
      0,0,1,   0,1,0,   0,1,1,

      // Right face  (x=1)
      1,0,0,   1,0,1,   1,1,1,
      1,0,0,   1,1,1,   1,1,0,

      // Top face    (y=1)
      0,1,0,   1,1,0,   1,1,1,
      0,1,0,   1,1,1,   0,1,1,

      // Bottom face (y=0)
      0,0,1,   1,0,1,   1,0,0,
      0,0,1,   1,0,0,   0,0,0,
    ]);

    const uvcoords = new Float32Array([
      // front
      0,0,  1,0,  1,1,
      0,0,  1,1,  0,1,

      // back
      0,0,  1,0,  1,1,
      0,0,  1,1,  0,1,

      // left
      0,0,  1,0,  1,1,
      0,0,  1,1,  0,1,

      // right
      0,0,  1,0,  1,1,
      0,0,  1,1,  0,1,

      // top
      0,0,  1,0,  1,1,
      0,0,  1,1,  0,1,

      // bottom
      0,0,  1,0,  1,1,
      0,0,  1,1,  0,1,
    ]);

    // For debugging: give each face a unique color in the "normal" data
    // We'll assign 6 vertices per face => 36 total
    const normals = new Float32Array([
      // Front face => Purple (1,0,1)
      1,0,1,  1,0,1,  1,0,1,
      1,0,1,  1,0,1,  1,0,1,

      // Back face => Teal (0,1,1)
      0,1,1,  0,1,1,  0,1,1,
      0,1,1,  0,1,1,  0,1,1,

      // Left face => Navy (0,0,1)
      0,0,1,  0,0,1,  0,0,1,
      0,0,1,  0,0,1,  0,0,1,

      // Right face => Red (1,0,0)
      1,0,0,  1,0,0,  1,0,0,
      1,0,0,  1,0,0,  1,0,0,

      // Top face => Green (0,1,0)
      0,1,0,  0,1,0,  0,1,0,
      0,1,0,  0,1,0,  0,1,0,

      // Bottom face => Yellow (1,1,0)
      1,1,0,  1,1,0,  1,1,0,
      1,1,0,  1,1,0,  1,1,0
    ]);

    // Create & fill buffers
    Cube.positionBuffer = worldGL.createBuffer();
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Cube.positionBuffer);
    worldGL.bufferData(worldGL.ARRAY_BUFFER, positions, worldGL.STATIC_DRAW);

    Cube.uvBuffer = worldGL.createBuffer();
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Cube.uvBuffer);
    worldGL.bufferData(worldGL.ARRAY_BUFFER, uvcoords, worldGL.STATIC_DRAW);

    Cube.normalBuffer = worldGL.createBuffer();
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Cube.normalBuffer);
    worldGL.bufferData(worldGL.ARRAY_BUFFER, normals, worldGL.STATIC_DRAW);
  }

  drawCube() {
    // Model matrix for this instance
    worldGL.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Position buffer
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Cube.positionBuffer);
    worldGL.vertexAttribPointer(a_Position, 3, worldGL.FLOAT, false, 0, 0);
    worldGL.enableVertexAttribArray(a_Position);

    // UV buffer
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Cube.uvBuffer);
    worldGL.vertexAttribPointer(a_UV, 2, worldGL.FLOAT, false, 0, 0);
    worldGL.enableVertexAttribArray(a_UV);

    // Normal buffer (actually "debug color" in normal-visualization mode)
    worldGL.bindBuffer(worldGL.ARRAY_BUFFER, Cube.normalBuffer);
    worldGL.vertexAttribPointer(a_Normal, 3, worldGL.FLOAT, false, 0, 0);
    worldGL.enableVertexAttribArray(a_Normal);

    // Which texture? (grass=2, sky=1, or others)
    worldGL.uniform1i(u_whichTexture, this.textureNum);

    // Draw
    worldGL.drawArrays(worldGL.TRIANGLES, 0, 36);
  }
}