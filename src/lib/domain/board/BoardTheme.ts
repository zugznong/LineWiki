export type ThemeName = 'Classic Green' | string;

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

  /* Future themes to be integrated after open beta
  public static readonly WOOD: BoardColors = {
    light: '#f0d9b5',
    dark: '#b58863',
    name: 'Wood'
  };

  public static readonly CHARCOAL: BoardColors = {
    light: '#e1e1e1',
    dark: '#4c4c4c',
    name: 'Charcoal'
  };
  */

  public static getTheme(name: ThemeName): BoardColors {
    // Open Beta 0 only supports Classic Green
    return this.CLASSIC_GREEN;
  }

  public static getAllThemes(): BoardColors[] {
    return [this.CLASSIC_GREEN];
  }
}


