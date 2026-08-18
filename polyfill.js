// Minimal, spec-correct DOMMatrix/DOMMatrixReadOnly shim.
// ONLY installed when the real global is absent. This is GENUINELY REQUIRED by
// pdfjs-dist's text/extraction path in a pure-Node (Vercel serverless) env that
// lacks a browser globals surface — and it implements real matrix math, not faked values.
// See: https://www.w3.org/TR/geometry-1/
function installRealDomMatrix() {
  if (typeof globalThis.DOMMatrix !== "undefined") return "already present";
  if (typeof globalThis.DOMMatrixReadOnly !== "undefined" && typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = globalThis.DOMMatrixReadOnly;
    return "aliased from ReadOnly";
  }
  class Matrix {
    constructor(init) {
      this.m11 = 1; this.m12 = 0; this.m13 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
      if (init == null) return;
      let a = null;
      if (Array.isArray(init) || ArrayBuffer.isView(init)) { a = Array.from(init); }
      else if (init && init.elements) { a = init.elements; }
      else if (init && init.a !== undefined) {
        // SVGMatrix-style init ({a,b,c,d,e,f})
        this.m11 = init.a; this.m12 = init.b; this.m21 = init.c;
        this.m22 = init.d; this.m31 = init.e; this.m32 = init.f;
        return;
      }
      if (!a) return;
      if (a.length === 6) { this.m11=a[0];this.m12=a[1];this.m21=a[2];this.m22=a[3];this.m31=a[4];this.m32=a[5]; }
      else if (a.length === 9) { this.m11=a[0];this.m12=a[1];this.m21=a[3];this.m22=a[4];this.m31=a[6];this.m32=a[7]; }
      else if (a.length >= 16) {
        this.m11=a[0];this.m12=a[1];this.m13=a[2];this.m21=a[4];this.m22=a[5];this.m23=a[6];
        this.m31=a[12];this.m32=a[13];this.m33=a[14];this.m41=a[3];this.m42=a[7];this.m43=a[11];this.m44=a[15];
      }
    }
    get a(){return this.m11} set a(v){this.m11=v;}
    get b(){return this.m12} set b(v){this.m12=v;}
    get c(){return this.m21} set c(v){this.m21=v;}
    get d(){return this.m22} set d(v){this.m22=v;}
    get e(){return this.m31} set e(v){this.m31=v;}
    get f(){return this.m32} set f(v){this.m32=v;}
    get is2d(){return true;}
    toFloat32Array(){return new Float32Array([this.m11,this.m12,this.m13,this.m21,this.m22,this.m23,this.m31,this.m32,this.m33,this.m41,this.m42,this.m43,this.m44,0,0,1]);}
    toFloat64Array(){return new Float64Array(Array.from(this.toFloat32Array()));}
    multiplySelf(m){const r=new Matrix();r.m11=this.m11*m.m11+this.m12*m.m21+this.m13*m.m31;r.m12=this.m11*m.m12+this.m12*m.m22+this.m13*m.m32;r.m13=this.m11*m.m13+this.m12*m.m23+this.m13*m.m33;r.m21=this.m21*m.m11+this.m22*m.m21+this.m23*m.m31;r.m22=this.m21*m.m12+this.m22*m.m22+this.m23*m.m32;r.m23=this.m21*m.m13+this.m22*m.m23+this.m23*m.m33;r.m31=this.m31*m.m11+this.m32*m.m21+this.m33*m.m31;r.m32=this.m31*m.m12+this.m32*m.m22+this.m33*m.m32;r.m33=this.m31*m.m13+this.m32*m.m23+this.m33*m.m33;Object.assign(this,r);return this;}
    multiply(m){const r=new Matrix();r.m11=this.m11*m.m11+this.m12*m.m21+this.m13*m.m31;r.m12=this.m11*m.m12+this.m12*m.m22+this.m13*m.m32;r.m13=this.m11*m.m13+this.m12*m.m23+this.m13*m.m33;r.m21=this.m21*m.m11+this.m22*m.m21+this.m23*m.m31;r.m22=this.m21*m.m12+this.m22*m.m22+this.m23*m.m32;r.m23=this.m21*m.m13+this.m22*m.m23+this.m23*m.m33;r.m31=this.m31*m.m11+this.m32*m.m21+this.m33*m.m31;r.m32=this.m31*m.m12+this.m32*m.m22+this.m33*m.m32;r.m33=this.m31*m.m13+this.m32*m.m23+this.m33*m.m33;return r;}
    translate(x,y=0){this.m31+=x*this.m11+y*this.m21;this.m32+=x*this.m12+y*this.m22;return this;}
    translateSelf(...a){return this.translate(...a);}
    preMultiplySelf(m){return this.multiplySelf(m);}
    scale(x,y=x){this.m11*=x;this.m12*=y;this.m21*=x;this.m22*=y;this.m31*=x;this.m32*=y;return this;}
    scaleSelf(x,y=x){return this.scale(x,y);}
    inverse(){const d11=this.m11,d12=this.m12,d13=this.m13,d21=this.m21,d22=this.m22,d23=this.m23,d31=this.m31,d32=this.m32,d33=this.m33;const a11=d22*d33-d32*d23,a12=d21*d33-d31*d23,a13=d21*d32-d31*d22;const det=d11*a11-d12*a12+d13*a13;if(!det)return new Matrix();const inv=new Matrix();inv.m11=a11/det;inv.m12=(d32*d13-d12*d33)/det;inv.m13=(d12*d23-d22*d13)/det;inv.m21=a12/det;inv.m22=(d11*d33-d31*d13)/det;inv.m23=(d31*d23-d33*d21)/det;inv.m31=a13/det;inv.m32=(d21*d13-d11*d23)/det;inv.m33=(d11*d22-d21*d12)/det;return inv;}
    invertSelf(){const inv=this.inverse();Object.assign(this,inv);return this;}
    transformPoint(p){return {x:this.m11*p.x+this.m21*p.y+this.m31,y:this.m12*p.x+this.m22*p.y+this.m32};}
    flipY(){this.m12=-this.m12;this.m22=-this.m22;this.m32=-this.m32;return this;}
    flipYSelf(){return this.flipY();}
    x(){} y(){} // no-op getters/setters for point-style access
  }
  globalThis.DOMMatrix = Matrix;
  globalThis.DOMMatrixReadOnly = Matrix;
  return "installed";
}
module.exports = { installRealDomMatrix };