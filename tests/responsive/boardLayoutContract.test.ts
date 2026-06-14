import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Board Layout Contract Tests', () => {
  it('should verify Board.svelte contains crucial layout IDs', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/board/Board.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="chess-board-card"');
    expect(content).toContain('id="chess-board-wrapper"');
    expect(content).toContain('id="chess-grid"');
  });

  it('should verify PositionMainArea.svelte contains mobile-board-card ID', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/position/PositionMainArea.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="mobile-board-card"');
  });

  it('should verify CandidateMovePanelTitle.svelte contains standard Candidate Moves korean title and not the legacy Candidate title via imported constant', () => {
    const titlePath = path.resolve(process.cwd(), 'src/lib/components/moves/CandidateMovePanelTitle.svelte');
    const titleContent = fs.readFileSync(titlePath, 'utf-8');

    expect(titleContent).toContain('CANDIDATE_MOVES_TITLE');
    expect(titleContent).not.toContain('주변 합법 후보수 (Candidate)');

    const constantPath = path.resolve(process.cwd(), 'src/lib/constants/uiText.ts');
    const constantContent = fs.readFileSync(constantPath, 'utf-8');
    
    // Validate that our centralized constant contains the primary title and has no legacy ones
    expect(constantContent).not.toContain('주변 합법 후보수 (Candidate)');
    expect(constantContent).toContain('합법 후보수 (Candidate Moves)');

    const mainAreaPath = path.resolve(process.cwd(), 'src/lib/components/position/PositionMainArea.svelte');
    const mainAreaContent = fs.readFileSync(mainAreaPath, 'utf-8');
    
    expect(mainAreaContent).not.toContain('주변 합법 후보수 (Candidate)');
    expect(mainAreaContent).toContain('CandidateMovePanelTitle');
  });

  it('should verify CandidateMoveList.svelte contains candidate move container and list IDs', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/moves/CandidateMoveList.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="candidate-move-container"');
    expect(content).toContain('id="candidate-move-list"');
  });

  it('should verify CSS files contain selectors expecting those IDs', () => {
    const boardCssPath = path.resolve(process.cwd(), 'src/lib/styles/features/board.css');
    const boardCss = fs.readFileSync(boardCssPath, 'utf-8');
    expect(boardCss).toContain('#chess-board-card');
    expect(boardCss).toContain('#chess-board-wrapper');
    expect(boardCss).toContain('#chess-grid');

    const movesCssPath = path.resolve(process.cwd(), 'src/lib/styles/features/moves.css');
    const movesCss = fs.readFileSync(movesCssPath, 'utf-8');
    expect(movesCss).toContain('#candidate-move-container');
    expect(movesCss).toContain('#candidate-move-list');
  });

  it('should verify PositionFallback.svelte contains position-fallback ID', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/position/PositionFallback.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="position-fallback"');
  });

  it('should verify Board.svelte style has identical width and height constraints to prevent distortion', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/board/Board.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('style="width: {boardSize}px; height: {boardSize}px;');
  });

  it('should verify CSS files do not force height 100% !important on #chess-board-wrapper to avoid layout overrides', () => {
    const desktopCssPath = path.resolve(process.cwd(), 'src/lib/styles/devices/desktop.css');
    const desktopCss = fs.readFileSync(desktopCssPath, 'utf-8');
    const desktopWideCssPath = path.resolve(process.cwd(), 'src/lib/styles/devices/desktop-wide.css');
    const desktopWideCss = fs.readFileSync(desktopWideCssPath, 'utf-8');

    // Scope block verification precisely between { and } for #chess-board-wrapper
    const wrapperInDesktopIndex = desktopCss.indexOf('#desktop-3-column-layout #chess-board-wrapper');
    const wrapperInDesktop = wrapperInDesktopIndex !== -1 
      ? desktopCss.substring(wrapperInDesktopIndex, desktopCss.indexOf('}', wrapperInDesktopIndex))
      : '';
    // Use regex to verify pure height is not constrained to 100% !important while allowing max-height
    expect(wrapperInDesktop).not.toMatch(/(?<![a-zA-Z-])height:\s*100%\s*!important/);

    const wrapperInWideIndex = desktopWideCss.indexOf('#wide-board-and-rail-layout #chess-board-wrapper');
    const wrapperInWide = wrapperInWideIndex !== -1
      ? desktopWideCss.substring(wrapperInWideIndex, desktopWideCss.indexOf('}', wrapperInWideIndex))
      : '';
    expect(wrapperInWide).not.toMatch(/(?<![a-zA-Z-])height:\s*100%\s*!important/);
  });

  it('should verify Board.svelte registration and definition of pointer events on the chess grid container', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/board/Board.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="chess-grid"');
    expect(content).toContain('onpointerdown=');
    expect(content).toContain('onpointermove=');
    expect(content).toContain('onpointerup=');
    expect(content).toContain('onpointercancel=');
    expect(content).toContain('onlostpointercapture=');

    // Securely verify that onpointerdown is indeed bound directly on #chess-grid container using regular expressions
    expect(content).toMatch(/id="chess-grid"[\s\S]*?onpointerdown=\{handlePointerDown\}/);

    // Also assert that typical handler function names exist in the file
    expect(content).toContain('handlePointerDown');
    expect(content).toContain('handlePointerMove');
    expect(content).toContain('handlePointerUp');
    expect(content).toContain('handlePointerCancel');
    expect(content).toContain('handleLostPointerCapture');
  });

  it('should verify Board.svelte contains Accessibility (a11y) role, tabindex and aria-label on #chess-grid', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/board/Board.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('id="chess-grid"');
    expect(content).toContain('role="grid"');
    expect(content).toContain('tabindex="0"');
    expect(content).toContain('aria-label="체스보드"');
  });

  it('should verify Board.svelte imports and renders DraggedPieceOverlay component with squareSize attribute', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/board/Board.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('import DraggedPieceOverlay from');
    // Ensure that DraggedPieceOverlay has either {squareSize} shorthand or squareSize={squareSize}
    expect(content).toMatch(/<DraggedPieceOverlay\s+[^>]*?(\{squareSize\}|squareSize=\{squareSize\})[^>]*?\/>/);
  });

  it('should verify DraggedPieceOverlay.svelte implements CSS translate transform center alignment', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/board/DraggedPieceOverlay.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('translate(-50%, -50%)');
  });

  it('should verify BoardPiece.svelte implements draggable="false" to prevent default browser drag conflict', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/board/BoardPiece.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Both the div and outer children should suppress browser native dragging
    expect(content).toContain('draggable="false"');
  });

  it('should verify BoardSquare.svelte contains data-square attribute for easy square identification and does not hardcode w-4 h-4 dots', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/board/BoardSquare.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('data-square=');
    // Ensure that pre-calculating hardcoded fixed pulse dot dimensions (w-4 h-4) are completely absent
    expect(content).not.toContain('w-4 h-4');
  });

  it('should verify board.css contains pan-y default scroll behavior and absolute touch disabling on drag active state class', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/styles/features/board.css');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check default scrolling allowance
    expect(content).toContain('touch-action: pan-y');
    
    // Check dragging-board drag lock behavior
    expect(content).toContain('.dragging-board');
    const draggingIndex = content.indexOf('.dragging-board');
    const draggingBlock = content.substring(draggingIndex, content.indexOf('}', draggingIndex));
    expect(draggingBlock).toMatch(/touch-action:\s*none/);
  });

  it('should verify BoardSquare.svelte contains aria-selected instead of aria-pressed for correct gridcell a11y specs', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/board/BoardSquare.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('aria-selected={isSelected}');
    expect(content).not.toContain('aria-pressed={isSelected}');
    expect(content).toContain('role="gridcell"');
  });

  it('should verify BoardSquare.svelte handles isCaptureDestination, legal-capture-ring and legal-destination-dot correctly without hardcoded dot sizes', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/components/board/BoardSquare.svelte');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('isCaptureDestination');
    expect(content).toContain('legal-capture-ring');
    expect(content).toContain('legal-destination-dot');
    expect(content).toContain('inset-[8%]');
    expect(content).toContain('rounded-full');
    expect(content).toContain('border');
    
    // Ensure capturing visual displays do not just rely on w-4 h-4 dots
    expect(content).not.toMatch(/class="[^"]*?w-4 h-4[^"]*?legal-capture-ring/);
  });
});
