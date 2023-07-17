import { Button } from "antd";
import { FC } from "react";

interface props {
  content: string;
  onClick: () => void;
}

const InputPercentageButton: FC<props> = ({ content, onClick }) => {
  return (
    <Button
      size="small"
      type="primary"
      ghost
      style={{
        borderRadius: "16px",
        fontWeight: 600,
        padding: "0px 8px",
      }}
      onClick={onClick}
    >
      {content}
    </Button>
  );
};

export default InputPercentageButton;
