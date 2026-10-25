import React, { useState, useLayoutEffect, useRef } from 'react';

// Görgetési sebesség (px / másodperc)
const MARQUEE_SPEED = 80;
const MARQUEE_GAP = '   '; // ennyi szóköz választja el a görgő szöveg ismétléseit
const FILLER_LENGTH = 60; // ennyi szóközzel töltjük ki a rövid végállomás nevet (a felesleg le van vágva)

// Egy oszlopnyi üres pixel hozzáfűzése a mátrix elejéhez vagy végéhez
const withBlankColumn = (matrix, position) =>
  matrix.map(row => (position === 'start' ? [0, ...row] : [...row, 0]));

const DotMatrixGrid = React.forwardRef(({ matrix, className = '' }, ref) => (
  <div
    ref={ref}
    className={`dotmatrix-grid dotmatrix-segment ${className}`}
    style={{
      gridTemplateColumns: `repeat(${matrix[0].length}, 3px)`,
      gridTemplateRows: 'repeat(7, 3px)'
    }}
  >
    {matrix.map((row, rowIndex) =>
      row.map((pixel, pixelIndex) => (
        <div
          key={`${rowIndex}-${pixelIndex}`}
          className={`dotmatrix-pixel ${pixel ? 'lit' : 'unlit'}`}
        />
      ))
    )}
  </div>
));

// Kitölti a rendelkezésre álló helyet; ha a szöveg nem fér ki,
// jobbról balra görgetve (marquee) jelenik meg.
function DotMatrixMarquee({ text, createDotMatrixText }) {
  const viewportRef = useRef(null);
  const textRef = useRef(null);
  const unitRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const [unitWidth, setUnitWidth] = useState(0);

  const textMatrix = withBlankColumn(createDotMatrixText(text), 'end');
  const gapMatrix = withBlankColumn(createDotMatrixText(MARQUEE_GAP), 'end');
  const fillerMatrix = createDotMatrixText(' '.repeat(FILLER_LENGTH));

  // Megmérjük, hogy a szöveg kifér-e a rendelkezésre álló helyre
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const measure = () => {
      if (!textRef.current) return;
      setOverflowing(textRef.current.offsetWidth > viewport.clientWidth);
      if (unitRef.current) setUnitWidth(unitRef.current.offsetWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [text, overflowing]);

  // Pixel oszloponként lépő görgetés, mint egy valódi dotmatrix kijelzőn
  const unitColumns = textMatrix[0].length + gapMatrix[0].length;
  const scrollDuration = unitWidth / MARQUEE_SPEED;
  const trackStyle = overflowing && unitWidth > 0
    ? { animation: `dotmatrix-marquee ${scrollDuration}s steps(${unitColumns}, end) infinite` }
    : undefined;

  return (
    <div className="dotmatrix-marquee" ref={viewportRef}>
      <div className="dotmatrix-marquee-track" style={trackStyle}>
        {overflowing ? (
          <>
            <div className="dotmatrix-marquee-unit" ref={unitRef}>
              <DotMatrixGrid matrix={textMatrix} ref={textRef} />
              <DotMatrixGrid matrix={gapMatrix} />
            </div>
            <div className="dotmatrix-marquee-unit" aria-hidden="true">
              <DotMatrixGrid matrix={textMatrix} />
              <DotMatrixGrid matrix={gapMatrix} />
            </div>
          </>
        ) : (
          <>
            <DotMatrixGrid matrix={textMatrix} ref={textRef} />
            <DotMatrixGrid matrix={fillerMatrix} />
          </>
        )}
      </div>
    </div>
  );
}

// Három oszlopos kijelző sor: VISZONYLAT | VÉGÁLLOMÁS | PERC
// A viszonylat és a perc oszlop fix, a végállomás kitölti a maradék helyet.
function DotMatrixLine({ route, direction, time, blinking, createDotMatrixText }) {
  const routeMatrix = withBlankColumn(createDotMatrixText(`${route.padEnd(4, ' ')} `), 'end');
  const timeMatrix = withBlankColumn(createDotMatrixText(` ${time.padStart(3, ' ')}`), 'start');

  return (
    <div className="dotmatrix-line">
      <div className={`dotmatrix-row ${blinking ? 'blinking' : ''}`}>
        <DotMatrixGrid matrix={routeMatrix} />
        <DotMatrixMarquee text={direction} createDotMatrixText={createDotMatrixText} />
        <DotMatrixGrid matrix={timeMatrix} />
      </div>
    </div>
  );
}

// Forgalmi zavar sor a kijelző alján, teljes szélességben görgetve
export function DotMatrixAlertLine({ text, createDotMatrixText }) {
  return (
    <div className="dotmatrix-line dotmatrix-alert-line">
      <div className="dotmatrix-row">
        <DotMatrixMarquee text={text} createDotMatrixText={createDotMatrixText} />
      </div>
    </div>
  );
}

export default DotMatrixLine;
