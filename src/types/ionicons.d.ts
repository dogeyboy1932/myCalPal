declare namespace JSX {
  interface IntrinsicElements {
    'ion-icon': {
      icon?: string;
      name?: string;
      class?: string;
      style?: React.CSSProperties;
      size?: 'small' | 'large';
      color?: string;
      [key: string]: any;
    };
  }
}
