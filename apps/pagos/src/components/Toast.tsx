interface Props {
  message: string;
  show: boolean;
}

export function Toast({ message, show }: Props) {
  return <div className={`pxo-toast${show ? ' show' : ''}`}>{message}</div>;
}
