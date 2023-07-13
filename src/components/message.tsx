import { FC } from "react";
import Alert from "react-bootstrap/Alert";

interface Props {
  type:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark";
  show: boolean;
  message: string;
}

export const MessageAlert: FC<Props> = ({
  type = "danger",
  show = false,
  message,
}) => {
  return (
    <>
      {show && (
        <Alert key={type} variant={type}>
          {message}
        </Alert>
      )}
    </>
  );
};
