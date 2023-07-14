/* eslint-disable react-hooks/exhaustive-deps */
import type { MenuProps } from "antd";
import {
  Button,
  Col,
  Dropdown,
  Row,
  Card,
  Segmented,
  Form,
  Input,
  Modal,
  message,
  Tooltip,
  Space,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import Web3 from "web3";
import { ContractAddress } from "./constants/contractsAddresses";
import { RestakingFarmAbi } from "./constants/farmContractAbi";
import { PurseBusdPoolAbi } from "./constants/purseBusdPoolAbi";
import { transformWalletAddress } from "./utils/transformWalletAddress";
import { handleExponential } from "./utils/mathCalculation";
import { TokenAddress } from "./constants/tokenAddresses";
import { ReloadOutlined, InfoCircleOutlined } from "@ant-design/icons";

const ACTION_TYPE = {
  DEPOSIT: 1,
  WITHDRAW: 2,
};

const App = () => {
  const [web3, setWeb3] = useState<Web3>(
    new Web3("https://bsc-dataseed.binance.org/")
  );
  const [modal, contextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();

  const [loading, setLoading] = useState<boolean>(true);
  const [farmContract, setFarmContract] = useState<any>(null);
  const [poolContract, setPoolContract] = useState<any>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [validAllowance, setValidAllowance] = useState<boolean>(false);
  const [allowance, setAllowance] = useState<number>(0);
  const [LPTokenAmount, setLPTokenAmount] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [stakedToken, setStakedToken] = useState<number>(0);
  const [rewardTokens, setRewardTokens] = useState<number>(0);
  const [rewardDebt, setRewardDebt] = useState<number>(0);
  const [actionType, setActionType] = useState<number>(ACTION_TYPE.DEPOSIT);

  const [rewardLoading, setRewardLoading] = useState<boolean>(false);

  useEffect(() => {
    initializeWeb3();
  }, []);

  useEffect(() => {
    initializeContract();
    connectWallet();
  }, [web3]);

  const initializeWeb3 = async () => {
    if (window.ethereum) {
      try {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.enable();
        setWeb3(web3);
      } catch (error) {
        messageApi.error("Initialize Web3 error: " + error);
      }
    } else {
      messageApi.error("Web3 not found in your browser.");
    }
  };

  const initializeContract = async () => {
    if (web3) {
      try {
        const farmContract = new web3.eth.Contract(
          RestakingFarmAbi,
          ContractAddress.FARM.address
        );

        const poolContract = new web3.eth.Contract(
          PurseBusdPoolAbi,
          ContractAddress.PURSE_BUSD.address
        );

        setFarmContract(farmContract);
        setPoolContract(poolContract);
        connectWallet();
      } catch (error) {
        console.error("Contract initialize error: " + error);
        messageApi.error("Contract initialize error: " + error);
      }
    } else {
      messageApi.error("Web3 not found in your browser.");
    }
  };

  const connectWallet = async () => {
    if (web3) {
      if (!account) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x38", // BSC Mainnet chain ID
              chainName: "BNB Smart Chain Mainnet",
              nativeCurrency: {
                name: "BNB",
                symbol: "BNB",
                decimals: 18,
              },
              rpcUrls: ["https://bsc-dataseed.binance.org"], // BSC Mainnet RPC URL
              blockExplorerUrls: ["https://bscscan.com"], // BSC Mainnet block explorer URL
            },
          ],
        });

        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          fetchTokensAmount(accounts[0]);
        }
      }
    }
  };

  const disconnectWallet = async () => {
    try {
      if (web3 && account) {
        setLoading(true);
        setAccount(null);
        setLPTokenAmount(0);
        setAllowance(0);
        setValidAllowance(false);
        setStakedToken(0);
        setRewardTokens(0);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTokensAmount = async (accountWallet = account) => {
    setLoading(true);
    const lpAmountPromise = poolContract.methods
      .balanceOf(accountWallet)
      .call();
    const allowanceAmountPromise = poolContract.methods
      .allowance(accountWallet, ContractAddress.FARM.address)
      .call();
    const stakedAmountPromise: Promise<{ amount: number; rewardDebt: number }> =
      farmContract.methods
        .userInfo(ContractAddress.PURSE_BUSD.address, accountWallet)
        .call();
    const rewardAmountPromise = farmContract.methods
      .pendingReward(ContractAddress.PURSE_BUSD.address, accountWallet)
      .call();

    const [lpBalance, allowanceBalance, stakedAmount, rewardAmount] =
      await Promise.all([
        lpAmountPromise,
        allowanceAmountPromise,
        stakedAmountPromise,
        rewardAmountPromise,
      ]);

    setLPTokenAmount(Number(web3.utils.fromWei(lpBalance, "ether")));
    const allowanceInEther = Number(
      web3.utils.fromWei(allowanceBalance, "ether")
    );

    setAllowance(allowanceInEther);
    setValidAllowance(allowanceInEther !== 0);
    setStakedToken(Number(web3.utils.fromWei(stakedAmount.amount, "ether")));
    setRewardDebt(Number(web3.utils.fromWei(stakedAmount.rewardDebt, "ether")));
    setRewardTokens(Number(web3.utils.fromWei(rewardAmount, "ether")));
    setLoading(false);
  };

  const fetchRewardAmount = async () => {
    try {
      const rewardAmount = await farmContract.methods
        .pendingReward(ContractAddress.PURSE_BUSD.address, account)
        .call();
      let amount = 0;
      if (rewardAmount) {
        amount = Number(web3.utils.fromWei(rewardAmount, "ether"));
        setRewardTokens(amount);
      }

      return amount;
    } catch (error) {
      console.error(error);
      messageApi.error("Fetch reward amount error: " + error);
    }
  };

  const fetchAllowance = async () => {
    try {
      const stakedAmount = await farmContract.methods
        .userInfo(ContractAddress.PURSE_BUSD.address, account)
        .call();
    } catch (error) {}
  };

  const depositValidation = (value: string | number) => {
    const numValue = Number(value);
    let message = "";
    if (numValue > LPTokenAmount) {
      message = "Insufficient LP Token balance.";
    } else if (numValue > allowance) {
      message = "Insufficient allowance.";
    } else if (numValue === 0) {
      message = "Deposit amount must larger than zero.";
    } else if (!/^(?=.*[1-9])\d*(\.\d{0,5})?$/.test(depositAmount.toString())) {
      message =
        "Please enter a deposit amount with up to 5 decimal places only.";
    }
    return {
      status: message === "",
      message,
    };
  };

  const confirmDeposit = async () => {
    try {
      const depositResult = await farmContract.methods
        .deposit(
          ContractAddress.PURSE_BUSD.address,
          web3.utils.toWei(depositAmount, "ether")
        )
        .send({ from: account });

      if (depositResult) {
        alert("Deposit successfully.");
        fetchTokensAmount();
      } else {
        messageApi.open({
          type: "error",
          content: `Deposit unsuccessfully. Please try again.`,
        });
      }
    } catch (error) {
      console.error(error);
      messageApi.open({
        type: "error",
        content: `Something went wrong: ${error}`,
      });
    }
  };

  const handleDeposit = () => {
    try {
      const { status, message } = depositValidation(depositAmount);

      if (!status) {
        messageApi.open({
          type: "warning",
          content: message,
        });
        return;
      }

      modal.confirm({
        title: "Confirm",
        content: `Are you sure to deposit ${depositAmount} ${ContractAddress.PURSE_BUSD.symbol}?`,
        okText: "Confirm",
        cancelText: "Cancel",
        onOk: () => confirmDeposit(),
      });
    } catch (error) {
      console.error(error);
      messageApi.open({
        type: "error",
        content: `Something went wrong: ${error}`,
      });
    }
  };

  const withdrawValidation = (value: string | number) => {
    const numValue = Number(value);
    let message = "";
    if (numValue > stakedToken) {
      message = "Staked balance is insufficient for withdrawal.";
    } else if (numValue === 0) {
      message = "Withdraw amount must larger than zero.";
    } else if (!/^(?=.*[1-9])\d*(\.\d{0,5})?$/.test(numValue.toString())) {
      message =
        "Please enter a withdraw amount with up to 5 decimal places only.";
    }
    return {
      status: message === "",
      message,
    };
  };

  const confirmWithdraw = async () => {
    try {
      let lpTokenBalance = await poolContract.methods.balanceOf(account).call();

      if (lpTokenBalance) {
        lpTokenBalance = web3.utils.toWei(lpTokenBalance, "ether");

        const withdrawResult = await farmContract.methods
          .withdraw(
            ContractAddress.PURSE_BUSD.address,
            web3.utils.toWei(depositAmount, "ether")
          )
          .send({ from: account });

        if (withdrawResult) {
          messageApi.open({
            type: "success",
            content: `Withdraw successfully.`,
          });
          alert("Withdraw successfully.");
          fetchTokensAmount();
        } else {
          messageApi.open({
            type: "error",
            content: `Withdraw unsuccessfully. Please try again.`,
          });
        }
      }
    } catch (error) {
      console.error(error);
      messageApi.open({
        type: "error",
        content: `Something went wrong: ${error}`,
      });
    }
  };

  const handleWithdraw = () => {
    try {
      const validationResult = withdrawValidation(withdrawAmount);

      if (!validationResult.status) {
        messageApi.open({
          type: "warning",
          content: validationResult.message,
        });
        return;
      }

      modal.confirm({
        title: "Confirm",
        content: `Are you sure to withdraw ${withdrawAmount} ${ContractAddress.PURSE_BUSD.symbol}?`,
        okText: "Confirm",
        cancelText: "Cancel",
        onOk: () => confirmWithdraw(),
      });
    } catch (error) {
      console.error(error);
      messageApi.open({
        type: "error",
        content: `Something went wrong: ${error}`,
      });
    }
  };

  const handleHarvest = async () => {
    try {
      const rewardResult = await farmContract.methods
        .claimReward(ContractAddress.PURSE_BUSD.address)
        .send({ from: account });

      alert("Harvest sucessfully.");
    } catch (error) {
      console.error(error);
      messageApi.open({
        type: "error",
        content: `Something went wrong: ${error}`,
      });
    }
  };

  const confirmHarvest = () => {};

  const changeActionType = (type: number) => {
    setActionType(type);
    if (type === ACTION_TYPE.WITHDRAW) {
      fetchTokensAmount(account!);
    }
  };

  const depositForm = useMemo(() => {
    return (
      <Form layout="vertical">
        <Row
          style={{ width: "100%", marginBottom: "0.5rem" }}
          justify={"space-between"}
          align={"middle"}
        >
          <Col md={12}>
            <b>Deposit Amount:</b>
          </Col>
          <Col md={12} style={{ textAlign: "right" }}>
            <small>Balance: {handleExponential(LPTokenAmount, 5)}</small>
          </Col>
        </Row>
        <Form.Item
          style={{ marginBottom: "3rem" }}
          name={"depositAmount"}
          rules={[
            () => ({
              validator(_, value) {
                const validationResult = depositValidation(value);
                if (!validationResult.status)
                  return Promise.reject(validationResult.message);
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input
            type="number"
            disabled={!validAllowance}
            placeholder="Enter Deposit Amount"
            onChange={(e) => setDepositAmount(Number(e.target.value))}
          />
        </Form.Item>

        {validAllowance ? (
          <Button block type="primary" onClick={handleDeposit}>
            Deposit
          </Button>
        ) : (
          <Button block type="primary" disabled={account !== ""}>
            Approve
          </Button>
        )}
      </Form>
    );
  }, [
    LPTokenAmount,
    validAllowance,
    allowance,
    handleDeposit,
    setDepositAmount,
  ]);

  const withdrawForm = useMemo(() => {
    return (
      <Form layout="vertical">
        <Row
          style={{ width: "100%", marginBottom: "0.5rem" }}
          justify={"space-between"}
          align={"middle"}
        >
          <Col md={12}>
            <b>Withdraw Amount:</b>
          </Col>
          <Col md={12} style={{ textAlign: "right" }}>
            <small>Balance: {handleExponential(stakedToken, 5)}</small>
          </Col>
        </Row>

        <Form.Item
          name={"withdrawAmount"}
          style={{ marginBottom: "3rem" }}
          rules={[
            () => ({
              validator(_, value) {
                const validationResult = withdrawValidation(value);
                if (!validationResult.status)
                  return Promise.reject(validationResult.message);
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input
            type="number"
            disabled={stakedToken === 0}
            placeholder="Enter Withdraw Amount"
            onChange={(e) => setWithdrawAmount(Number(e.target.value))}
          />
        </Form.Item>
        <Button
          block
          disabled={stakedToken === 0}
          type="primary"
          onClick={handleWithdraw}
        >
          Withdraw
        </Button>
      </Form>
    );
  }, [stakedToken, setWithdrawAmount, handleWithdraw]);

  const rewardForm = useMemo(() => {
    return (
      <Row align={"middle"} justify={"space-between"}>
        <Col md={12}>
          <b>
            <Tooltip title={`Reward debt: ${rewardDebt}`}>
              <InfoCircleOutlined />
            </Tooltip>{" "}
            Reward Earned
          </b>
          <div>
            {rewardTokens > 0 ? handleExponential(rewardTokens, 5) : 0}{" "}
            {TokenAddress.PURSE_TOKEN.symbol}
          </div>
        </Col>
        <Col md={12} style={{ textAlign: "right" }}>
          <Space direction="horizontal">
            <Button type="default" onClick={() => fetchRewardAmount()}>
              Refresh
            </Button>
            <Button type="primary" onClick={handleHarvest}>
              Harvest
            </Button>
          </Space>
        </Col>
      </Row>
    );
  }, [rewardTokens, handleHarvest, rewardDebt]);

  const items: MenuProps["items"] = [
    {
      key: "1",
      label: (
        <span
          onClick={async () => await navigator.clipboard.writeText(account!)}
        >
          Copy Address
        </span>
      ),
    },
    {
      key: "2",
      label: <span onClick={disconnectWallet}>Disconnect</span>,
    },
  ];

  return (
    <>
      <Row>
        <Col md={6} sm={2} xs={2}></Col>
        <Col md={12} sm={20} xs={20}>
          <Row justify={"space-between"} align={"middle"}>
            <Col>
              <h3>Pundi X Interview Assignment</h3>
            </Col>
            <Col>
              {account ? (
                <Dropdown menu={{ items }} placement="bottomRight" arrow>
                  <Button type="primary">
                    {transformWalletAddress(account)}
                  </Button>
                </Dropdown>
              ) : (
                <Button onClick={connectWallet} type="primary">
                  Connect Wallet
                </Button>
              )}
            </Col>
          </Row>
        </Col>
        <Col md={6} sm={2} xs={2}></Col>
      </Row>

      <Row>
        <Col md={6} sm={2} xs={2}></Col>
        <Col md={12} sm={20} xs={20}>
          <Card
            title={<h5>{ContractAddress.PURSE_BUSD.symbol}</h5>}
            extra={
              <Segmented
                onChange={(value) => changeActionType(Number(value))}
                options={[
                  {
                    label: "Deposit",
                    value: ACTION_TYPE.DEPOSIT,
                  },
                  {
                    label: "Withdraw",
                    value: ACTION_TYPE.WITHDRAW,
                  },
                ]}
              />
            }
            loading={loading}
          >
            {actionType === ACTION_TYPE.DEPOSIT ? depositForm : withdrawForm}
          </Card>
        </Col>
        <Col md={6} sm={2} xs={2}></Col>

        {rewardTokens > 0 && (
          <>
            <Col md={6} sm={2} xs={2}></Col>
            <Col md={12} sm={20} xs={20} style={{ marginTop: "1rem" }}>
              <Card>{rewardForm}</Card>
            </Col>
            <Col md={6} sm={2} xs={2}></Col>
          </>
        )}
      </Row>
      {contextHolder}
      {messageContextHolder}
    </>
  );
};

export default App;
