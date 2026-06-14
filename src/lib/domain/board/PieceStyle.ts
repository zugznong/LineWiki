export type PieceStyleName =
  | 'Cburnett' | 'Chessnut' | 'Merida' | 'RhosGFX'
  | 'Unicode Classic';

export type PieceStyleConfig =
  | {
      kind: 'svg';
      name: PieceStyleName;
      assetDirectory: string;
      scale: number;
      label: string;
      licenseId: string;
    }
  | {
      kind: 'unicode';
      name: PieceStyleName;
      scale: number;
      whiteColor: string;
      blackColor: string;
      whiteFilter: string;
      blackFilter: string;
    };

export class PieceStyle {
  public static readonly CBURNETT: PieceStyleConfig = {
    kind: 'svg',
    name: 'Cburnett',
    assetDirectory: 'cburnett',
    scale: 0.85,
    label: 'Cburnett Classic',
    licenseId: 'GPLv2+'
  };

  public static readonly CHESSNUT: PieceStyleConfig = {
    kind: 'svg',
    name: 'Chessnut',
    assetDirectory: 'chessnut',
    scale: 0.85,
    label: 'Chessnut Wood',
    licenseId: 'Apache 2.0'
  };

  public static readonly MERIDA: PieceStyleConfig = {
    kind: 'svg',
    name: 'Merida',
    assetDirectory: 'merida',
    scale: 0.85,
    label: 'Merida Geometric',
    licenseId: 'GPLv2+'
  };

  public static readonly RHOSGFX: PieceStyleConfig = {
    kind: 'svg',
    name: 'RhosGFX',
    assetDirectory: 'rhosgfx',
    scale: 0.85,
    label: 'RhosGFX Shiny',
    licenseId: 'CC0 1.0'
  };

  public static readonly CLASSIC: PieceStyleConfig = {
    kind: 'unicode',
    name: 'Unicode Classic',
    scale: 0.76,
    whiteColor: '#ffffff',
    blackColor: '#0f172a',
    whiteFilter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.55))',
    blackFilter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.25)) drop-shadow(0 2px 3px rgba(0,0,0,0.7))'
  };

  private static readonly SVG_THEMES: Array<{ name: PieceStyleName; asset: string; label: string; license: string }> = [
    { name: 'Cburnett', asset: 'cburnett', label: 'Cburnett Classic', license: 'GPLv2+' },
    { name: 'Chessnut', asset: 'chessnut', label: 'Chessnut Wood', license: 'Apache 2.0' },
    { name: 'Merida', asset: 'merida', label: 'Merida Geometric', license: 'GPLv2+' },
    { name: 'RhosGFX', asset: 'rhosgfx', label: 'RhosGFX Shiny', license: 'CC0 1.0' }
  ];

  public static getStyle(name: string): PieceStyleConfig {
    const matched = this.SVG_THEMES.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (matched) {
      return {
        kind: 'svg',
        name: matched.name,
        assetDirectory: matched.asset,
        scale: 0.85,
        label: matched.label,
        licenseId: matched.license
      };
    }
    if (name === 'Unicode Classic') {
      return this.CLASSIC;
    }
    return this.CBURNETT;
  }

  public static getAllStyles(): PieceStyleConfig[] {
    const list: PieceStyleConfig[] = this.SVG_THEMES.map(t => ({
      kind: 'svg',
      name: t.name,
      assetDirectory: t.asset,
      scale: 0.85,
      label: t.label,
      licenseId: t.license
    }));
    list.push(this.CLASSIC);
    return list;
  }
}

