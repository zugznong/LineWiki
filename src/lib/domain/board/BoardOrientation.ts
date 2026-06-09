export type Orientation = 'white' | 'black';

export class BoardOrientation {
  constructor(public readonly value: Orientation) {}

  public toggle(): BoardOrientation {
    return new BoardOrientation(this.value === 'white' ? 'black' : 'white');
  }

  public flip(): BoardOrientation {
    return new BoardOrientation(this.value === 'white' ? 'black' : 'white');
  }

  public isFlipped(): boolean {
    return this.value === 'black';
  }
}

