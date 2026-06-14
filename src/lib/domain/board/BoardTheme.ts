export type ThemeName = 'Classic Green' | 'Walnut' | 'Slate';

export interface BoardColors {
  light: string;
  dark: string;
  name: ThemeName;
}

export class BoardTheme {
  public static readonly CLASSIC_GREEN: BoardColors = {
    light: '#eeeed2',
    dark: '#769656',
    name: 'Classic Green'
  };

  public static readonly WALNUT: BoardColors = {
    light: '#f0d9b5',
    dark: '#b58863',
    name: 'Walnut'
  };

  public static readonly SLATE: BoardColors = {
    light: '#eceff1',
    dark: '#546e7a',
    name: 'Slate'
  };

  public static getTheme(name: ThemeName): BoardColors {
    if (name === 'Walnut') {
      return this.WALNUT;
    }
    if (name === 'Slate') {
      return this.SLATE;
    }
    return this.CLASSIC_GREEN;
  }

  public static getAllThemes(): BoardColors[] {
    return [this.CLASSIC_GREEN, this.WALNUT, this.SLATE];
  }
}


