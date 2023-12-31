/* eslint-disable react-hooks/exhaustive-deps */
import {
  CopyOutlined,
  DollarOutlined,
  DownOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import {
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Skeleton,
  Space,
  Tooltip,
  message,
} from "antd";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import Web3 from "web3";
import InputPercentageButton from "./components/inputPercentageButton";
import { RestakingFarmAbi } from "./constants/abi/farmContractAbi";
import { PurseBusdPoolAbi } from "./constants/abi/purseBusdPoolAbi";
import { ContractAddress } from "./constants/contracts";
import { TokenAddress } from "./constants/tokens";
import {
  divide,
  handleExponential,
  isEqual,
  isLargerThan,
  multiply,
} from "./utils/mathCalculation";
import { transformWalletAddress } from "./utils/transformWalletAddress";

const ACTION_TYPE = {
  DEPOSIT: 1,
  WITHDRAW: 2,
};

const bscChainId = "0x38";

const App = () => {
  const [web3, setWeb3] = useState<Web3>(
    new Web3("https://bsc-dataseed.binance.org/")
  );
  const [farmContract, setFarmContract] = useState<any>(null);
  const [poolContract, setPoolContract] = useState<any>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [validChain, setValidChain] = useState<boolean>(true);

  const [modal, contextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();

  const [loading, setLoading] = useState<boolean>(false);
  const [rewardLoading, setRewardLoading] = useState<boolean>(false);
  const [approveLoading, setApproveLoading] = useState<boolean>(false);

  const [validAllowance, setValidAllowance] = useState<boolean>(false);
  const [allowance, setAllowance] = useState<string>("0");
  const [LPTokenAmount, setLPTokenAmount] = useState<string>("0");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("0");
  const [depositAmount, setDepositAmount] = useState<string>("0");
  const [stakedToken, setStakedToken] = useState<string>("0");
  const [rewardTokens, setRewardTokens] = useState<string>("0");
  const [rewardDebt, setRewardDebt] = useState<string>("0");
  const [rewardCost, setRewardCost] = useState<string>("0");

  const [actionType, setActionType] = useState<number>(ACTION_TYPE.DEPOSIT);

  useEffect(() => {
    initializeWeb3();
  }, []);

  useEffect(() => {
    initializeContract();

    if (web3) {
      const ethereumProvider = window.ethereum;
      if (ethereumProvider) {
        ethereumProvider.on("accountsChanged", handleAccountsChanged);
        ethereumProvider.on("chainChanged", handleChainChanged);
        return () => {
          ethereumProvider.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
          ethereumProvider.removeListener("chainChanged", handleChainChanged);
        };
      }
    }
  }, [web3]);

  const initializeWeb3 = async () => {
    if (window.ethereum) {
      try {
        const web3 = new Web3(window.ethereum);
        setWeb3(web3);
      } catch (error) {
        messageApi.error(
          "Initialize Web3 error. Please refresh the page and try again."
        );
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
          TokenAddress.CAKE_LP_TOKEN.address
        );

        setFarmContract(farmContract);
        setPoolContract(poolContract);
      } catch (error) {
        console.error("Contract initialize error: " + error);
        messageApi.error("Contract initialize error: " + error);
      }
    } else {
      messageApi.error("Web3 not found in your browser.");
    }
  };

  const handleChainChanged = (newChainId: any) => {
    setValidChain(newChainId === bscChainId);
    if (newChainId !== bscChainId) resetInputs();
  };

  const handleAccountsChanged = (accounts: any) => {
    const newAccount = accounts[0] || "";
    setAccount(newAccount);
    if (newAccount && newAccount !== "") {
      setDepositAmount("0");
      setWithdrawAmount("0");
      fetchTokensAmount(newAccount);
    }
  };

  const connectWallet = async () => {
    try {
      if (web3 && window.ethereum) {
        const currentChainId = await window.ethereum.request({
          method: "eth_chainId",
        });

        // Switch to bsc mainnet
        if (currentChainId !== bscChainId) {
          setValidChain(false);
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: bscChainId }],
          });
          setValidChain(true);
        }

        let connectedAccounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (connectedAccounts.length === 0) {
          connectedAccounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
        }

        if (!account && connectedAccounts.length > 0) {
          const account = connectedAccounts[0];
          setAccount(account);
          fetchTokensAmount(account);
        }
      } else {
        messageApi.error("Web3 not found in your browser.");
      }
    } catch (error: any) {
      console.error(error);
      messageApi.error(`Something went wrong: ${error["message"]}`);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (web3 && account) {
        resetInputs();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const items: MenuProps["items"] = [
    {
      key: "1",
      label: (
        <span
          onClick={async () => await navigator.clipboard.writeText(account!)}
        >
          <CopyOutlined /> Copy Address
        </span>
      ),
    },
    {
      key: "2",
      label: (
        <span
          onClick={async () =>
            window.open(
              "https://pancakeswap.finance/v2/add/0x29a63F4B209C29B4DC47f06FFA896F32667DAD2C/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
              "_blank"
            )
          }
        >
          <DollarOutlined /> Get LP Token
        </span>
      ),
    },
    {
      key: "3",
      label: (
        <span
          onClick={async () =>
            window.open(
              `https://bscscan.com/address/0x439ec8159740a9B9a579F286963Ac1C050aF31C8?fromaddress=${account}`,
              "_blank"
            )
          }
        >
          <ExportOutlined /> Transactions
        </span>
      ),
    },
    {
      key: "4",
      label: (
        <span onClick={disconnectWallet}>
          <LogoutOutlined /> Disconnect
        </span>
      ),
    },
  ];

  const resetInputs = () => {
    setLoading(true);
    setAccount(null);
    setLPTokenAmount("0");
    setAllowance("0");
    setValidAllowance(false);
    setStakedToken("0");
    setRewardTokens("0");
    setDepositAmount("0");
    setWithdrawAmount("0");
    setLoading(false);
  };

  const fetchRewardAmount = async () => {
    setRewardLoading(true);
    try {
      const rewardAmountPromise = farmContract.methods
        .pendingReward(TokenAddress.CAKE_LP_TOKEN.address, account)
        .call();

      const [rewardAmount, priceResult] = await Promise.all([
        rewardAmountPromise,
        fetchPursePriceFeed(),
      ]);

      let amount = "0";
      let amountPrice = "0";
      if (rewardAmount) {
        amount = handleExponential(web3.utils.fromWei(rewardAmount, "ether"));

        if (priceResult && priceResult.status === 200) {
          amountPrice = multiply(amount, priceResult.data.usdPriceFormatted, 4);
        } else {
          messageApi.error("Fetch PURSE price error");
        }
      }

      setRewardTokens(amount);
      setRewardCost(amountPrice);
    } catch (error) {
      console.error(error);
      messageApi.error("Fetch reward amount error: " + error);
    }
    setRewardLoading(false);
  };

  const fetchPursePriceFeed = async (): Promise<{
    status: number;
    data: { usdPrice: number; usdPriceFormatted: string };
  }> => {
    return new Promise(async (resolve, reject) => {
      try {
        const priceResult: any = await axios.get(
          "https://deep-index.moralis.io/api/v2/erc20/0x29a63F4B209C29B4DC47f06FFA896F32667DAD2C/price?chain=bsc&include=percent_change",
          {
            headers: {
              accept: "application/json",
              "Access-Control-Allow-Origin": "*",
              referrerPolicy: "origin-when-cross-origin",
              "X-API-Key":
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjA0YjgyYzUyLWEzZDgtNDFlZC04ZGU3LWNmYmQzNDA3ZTA4MyIsIm9yZ0lkIjoiMzQ4NzY3IiwidXNlcklkIjoiMzU4NDg0IiwidHlwZUlkIjoiYjM2OWFjMDEtOTVhOC00Yzg3LWFiNWMtNDVkMDQ5OTMwMmJjIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE2ODk2NTExOTAsImV4cCI6NDg0NTQxMTE5MH0.bX4FTYB09GacxDC-nEKk3z1owoJIyDi_Fo1H9MlXzcM",
            },
          }
        );
        resolve(priceResult);
      } catch (error) {
        messageApi.error("Fetch purse price error: " + error);
        reject(error);
      }
    });
  };

  const fetchTokensAmount = async (accountWallet = account) => {
    setLoading(true);

    if (accountWallet !== "" && accountWallet) {
      const lpAmountPromise = poolContract.methods
        .balanceOf(accountWallet)
        .call();
      const allowanceAmountPromise = poolContract.methods
        .allowance(accountWallet, ContractAddress.FARM.address)
        .call();
      const stakedAmountPromise: Promise<{
        amount: number;
        rewardDebt: number;
      }> = farmContract.methods
        .userInfo(TokenAddress.CAKE_LP_TOKEN.address, accountWallet)
        .call();
      const rewardAmountPromise = farmContract.methods
        .pendingReward(TokenAddress.CAKE_LP_TOKEN.address, accountWallet)
        .call();

      const [
        lpBalance,
        allowanceBalance,
        stakedAmount,
        rewardAmount,
        priceFeed,
      ] = await Promise.all([
        lpAmountPromise,
        allowanceAmountPromise,
        stakedAmountPromise,
        rewardAmountPromise,
        fetchPursePriceFeed(),
      ]);

      const allowanceInEther = handleExponential(
        web3.utils.fromWei(allowanceBalance, "ether")
      );
      const rewardTokens = handleExponential(
        web3.utils.fromWei(rewardAmount, "ether")
      );

      setLPTokenAmount(
        handleExponential(web3.utils.fromWei(lpBalance, "ether"))
      );
      setAllowance(allowanceInEther);
      setValidAllowance(isLargerThan(allowanceInEther, 0));
      setStakedToken(
        handleExponential(web3.utils.fromWei(stakedAmount.amount, "ether"))
      );
      setRewardDebt(
        handleExponential(web3.utils.fromWei(stakedAmount.rewardDebt, "ether"))
      );
      setRewardTokens(rewardTokens);

      let totalPrice = "0";
      if (priceFeed.status === 200) {
        totalPrice = multiply(
          rewardTokens,
          priceFeed.data.usdPriceFormatted,
          4
        );
      }
      setRewardCost(totalPrice);
    }

    setLoading(false);
  };

  const changeActionType = (type: number) => {
    setActionType(type);
    fetchTokensAmount();
    setDepositAmount("0");
    setWithdrawAmount("0");
  };

  const handleApproveLpToken = async () => {
    setApproveLoading(true);
    try {
      const approveResult = await poolContract.methods
        .approve(ContractAddress.FARM.address, web3.utils.toWei(1, "ether"))
        .send({ from: account });

      if (approveResult) {
        messageApi.success("Aprroved allowance successfully.");
      } else {
        messageApi.error(
          "Aprroved allowance unsuccessfully. Please try again."
        );
      }
      fetchTokensAmount();
    } catch (error) {
      console.error(error);
      messageApi.error(`Something went wrong: ${error}`);
    }
    setApproveLoading(false);
  };

  const handleDepositPercentage = (value: number) => {
    const amount = multiply(divide(value, 100), LPTokenAmount);
    setDepositAmount(handleExponential(amount));
  };

  const depositValidation = (value: string) => {
    let message = "";
    if (isLargerThan(value, LPTokenAmount)) {
      message = "Insufficient LP Token balance.";
    } else if (isLargerThan(value, allowance)) {
      message = "Insufficient allowance. Please approve the allowance.";
    } else if (isEqual(value, 0)) {
      message = "Deposit amount must larger than zero.";
    } else if (!/^(?=.*[1-9])\d*(\.\d{0,18})?$/.test(value)) {
      message =
        "Please enter a deposit amount with up to 18 decimal places only.";
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
          TokenAddress.CAKE_LP_TOKEN.address,
          web3.utils.toWei(handleExponential(depositAmount), "ether")
        )
        .send({ from: account });

      if (depositResult) {
        messageApi.success("Deposit successfully.");
      } else {
        messageApi.error("Deposit unsuccessfully. Please try again.");
      }
      fetchTokensAmount();
      setDepositAmount("0");
    } catch (error) {
      console.error(error);
      messageApi.error(`Something went wrong: ${error}`);
    }
  };

  const handleDeposit = () => {
    try {
      const { status, message } = depositValidation(depositAmount);

      if (!status) {
        messageApi.warning(message);
        return;
      }

      modal.confirm({
        title: "Deposit Confirmation",
        content: (
          <p>
            Are you sure want to deposit {depositAmount}{" "}
            {TokenAddress.CAKE_LP_TOKEN.symbol}? <br />
            <br />
            *Note: All the existing rewards will be claimed and transfer to you
            account once deposit successfully.
          </p>
        ),
        okText: "Confirm",
        cancelText: "Cancel",
        onOk: () => confirmDeposit(),
      });
    } catch (error) {
      console.error(error);
      messageApi.error(`Something went wrong: ${error}`);
    }
  };

  const handleWithdrawPercentage = (value: number) => {
    const amount = multiply(divide(value, 100), stakedToken);
    setWithdrawAmount(handleExponential(amount));
  };

  const withdrawValidation = (value: string) => {
    let message = "";
    if (isLargerThan(value, stakedToken)) {
      message = "Staked balance is insufficient for withdrawal.";
    } else if (isEqual(value, 0)) {
      message = "Withdraw amount must larger than zero.";
    } else if (!/^(?=.*[1-9])\d*(\.\d{0,18})?$/.test(value)) {
      message =
        "Please enter a withdraw amount with up to 18 decimal places only.";
    }
    return {
      status: message === "",
      message,
    };
  };

  const confirmWithdraw = async () => {
    try {
      const withdrawResult = await farmContract.methods
        .withdraw(
          TokenAddress.CAKE_LP_TOKEN.address,
          web3.utils.toWei(handleExponential(withdrawAmount), "ether")
        )
        .send({ from: account });

      if (withdrawResult) {
        messageApi.success(`Withdraw successfully.`);
      } else {
        messageApi.error(`Withdraw unsuccessfully. Please try again.`);
      }
      fetchTokensAmount();
      setWithdrawAmount("0");
    } catch (error) {
      console.error(error);
      messageApi.error(`Something went wrong: ${error}`);
    }
  };

  const handleWithdraw = () => {
    try {
      const validationResult = withdrawValidation(withdrawAmount);

      if (!validationResult.status) {
        messageApi.warning(validationResult.message);
        return;
      }

      modal.confirm({
        title: "Withdraw Confirmartion",
        content: (
          <p>
            Are you sure want to withdraw {withdrawAmount}{" "}
            {TokenAddress.CAKE_LP_TOKEN.symbol}? <br />
            <br />
            *Note: All the existing rewards will be claimed and transfer to you
            account once withdraw successfully.
          </p>
        ),
        okText: "Confirm",
        cancelText: "Cancel",
        onOk: () => confirmWithdraw(),
      });
    } catch (error) {
      console.error(error);
      messageApi.error(`Something went wrong: ${error}`);
    }
  };

  const handleHarvest = async () => {
    try {
      if (isEqual(rewardTokens, 0)) {
        messageApi.warning("You don't have reward yet.");
        fetchRewardAmount();
        return;
      }

      modal.confirm({
        title: "Claim Reward Confirmation",
        content: `Are you sure to claim all rewards?`,
        okText: "Confirm",
        cancelText: "Cancel",
        onOk: () => confirmHarvest(),
      });
    } catch (error) {
      console.error(error);
      messageApi.error(`Something went wrong: ${error}`);
    }
  };

  const confirmHarvest = async () => {
    try {
      const rewardResult = await farmContract.methods
        .claimReward(TokenAddress.CAKE_LP_TOKEN.address)
        .send({ from: account });

      if (rewardResult) {
        messageApi.success("Claim reward successfully.");
      } else {
        messageApi.error(`Claim reward unsuccessfully. Please try again.`);
      }
      fetchTokensAmount();
    } catch (error) {
      console.error(error);
      messageApi.error(`Something went wrong: ${error}`);
    }
  };

  const header = useMemo(
    () => (
      <Row style={{ marginBottom: "0.5rem" }}>
        <Col md={6} sm={2} xs={2}></Col>
        <Col md={12} sm={20} xs={20}>
          <Row justify={"space-between"} align={"middle"}>
            <Col>
              <h3>{TokenAddress.CAKE_LP_TOKEN.symbol} Farming Web Dapp</h3>
            </Col>
            <Col>
              {account ? (
                <Dropdown menu={{ items }} placement="bottomRight" arrow>
                  <Button type="primary">
                    {transformWalletAddress(account)}
                    <DownOutlined />
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
    ),
    [account, transformWalletAddress, connectWallet]
  );

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
            <small>
              Balance: {isLargerThan(LPTokenAmount, 0) ? LPTokenAmount : 0}{" "}
              {TokenAddress.CAKE_LP_TOKEN.symbol}
            </small>
          </Col>
        </Row>
        <Form.Item
          style={{ marginBottom: "3rem" }}
          extra={
            <Space wrap style={{ float: "right", marginTop: "1rem" }}>
              <InputPercentageButton
                content="25%"
                onClick={() => handleDepositPercentage(25)}
              />
              <InputPercentageButton
                content="50%"
                onClick={() => handleDepositPercentage(50)}
              />
              <InputPercentageButton
                content="75%"
                onClick={() => handleDepositPercentage(75)}
              />
              <InputPercentageButton
                content="MAX"
                onClick={() => handleDepositPercentage(100)}
              />
            </Space>
          }
        >
          <Input
            type="number"
            max={LPTokenAmount}
            min={0}
            disabled={!validAllowance || !validChain}
            placeholder="Enter Deposit Amount"
            onChange={(e) => {
              const amount = e.target.value;
              setDepositAmount(amount);
            }}
            onKeyDown={(e) => {
              const restrictedKeys = ["e", "-", "E"]; // Array of restricted key codes

              if (restrictedKeys.includes(e.key)) {
                e.preventDefault();
              }
            }}
            value={depositAmount}
          />
        </Form.Item>

        {!account || account === "" || isEqual(LPTokenAmount, 0) ? (
          <Button
            block
            type="primary"
            onClick={() =>
              window.open(
                "https://pancakeswap.finance/v2/add/0x29a63F4B209C29B4DC47f06FFA896F32667DAD2C/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
                "_blank"
              )
            }
          >
            Get LP Token
          </Button>
        ) : (
          <>
            {(!validAllowance || isLargerThan(depositAmount, allowance)) && (
              <Button
                block
                style={{ marginBottom: "0.7rem" }}
                type="primary"
                ghost
                loading={approveLoading}
                disabled={account === "" || !validChain}
                onClick={handleApproveLpToken}
              >
                Approve (Available: {allowance}{" "}
                {TokenAddress.CAKE_LP_TOKEN.symbol})
              </Button>
            )}

            {isLargerThan(LPTokenAmount, 0) && validAllowance && (
              <Button
                block
                type="primary"
                onClick={handleDeposit}
                disabled={!validChain || account === ""}
              >
                Deposit
              </Button>
            )}
          </>
        )}
      </Form>
    );
  }, [
    LPTokenAmount,
    validAllowance,
    allowance,
    depositAmount,
    validChain,
    account,
    handleDeposit,
    setDepositAmount,
    handleDepositPercentage,
    handleApproveLpToken,
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
            <small>
              Balance: {isLargerThan(stakedToken, 0) ? stakedToken : 0}{" "}
              {TokenAddress.CAKE_LP_TOKEN.symbol}
            </small>
          </Col>
        </Row>

        <Form.Item
          style={{ marginBottom: "3rem" }}
          extra={
            isLargerThan(stakedToken, 0) && (
              <Space wrap style={{ float: "right", marginTop: "1rem" }}>
                <InputPercentageButton
                  content="25%"
                  onClick={() => handleWithdrawPercentage(25)}
                />
                <InputPercentageButton
                  content="50%"
                  onClick={() => handleWithdrawPercentage(50)}
                />
                <InputPercentageButton
                  content="75%"
                  onClick={() => handleWithdrawPercentage(75)}
                />
                <InputPercentageButton
                  content="MAX"
                  onClick={() => handleWithdrawPercentage(100)}
                />
              </Space>
            )
          }
        >
          <Input
            type="text"
            max={stakedToken}
            min={0}
            disabled={isEqual(stakedToken, 0) || !validChain}
            placeholder="Enter Withdraw Amount"
            value={withdrawAmount}
            onChange={(e) => {
              const amount = e.target.value;
              setWithdrawAmount(amount);
            }}
            onKeyDown={(e) => {
              const restrictedKeys = ["e", "-", "E"]; // Array of restricted key codes

              if (restrictedKeys.includes(e.key)) {
                e.preventDefault();
              }
            }}
          />
        </Form.Item>
        <Button
          block
          disabled={isEqual(stakedToken, 0) || !validChain}
          type="primary"
          onClick={handleWithdraw}
        >
          Withdraw
        </Button>
      </Form>
    );
  }, [
    stakedToken,
    validChain,
    withdrawAmount,
    setWithdrawAmount,
    handleWithdraw,
    handleWithdrawPercentage,
  ]);

  const rewardForm = useMemo(() => {
    return (
      isLargerThan(rewardTokens, 0) && (
        <>
          <Col md={6} sm={2} xs={2}></Col>
          <Col md={12} sm={20} xs={20} style={{ marginTop: "1rem" }}>
            <Card>
              <Row align={"middle"} justify={"space-between"}>
                <Col md={12}>
                  <b>
                    <Tooltip title={`Reward debt: ${rewardDebt}`}>
                      <InfoCircleOutlined />
                    </Tooltip>{" "}
                    Reward Earned
                  </b>

                  <div>
                    <Skeleton
                      active={true}
                      loading={rewardLoading}
                      paragraph={{ rows: 0 }}
                    >
                      {isLargerThan(rewardTokens, 0) ? rewardTokens : 0}{" "}
                      {TokenAddress.PURSE_TOKEN.symbol} <br />≈ {rewardCost} USD
                    </Skeleton>
                  </div>
                </Col>
                <Col md={12} style={{ textAlign: "right" }}>
                  <Space direction="horizontal">
                    <Button type="default" onClick={fetchRewardAmount}>
                      Refresh
                    </Button>
                    <Button
                      type="primary"
                      onClick={handleHarvest}
                      disabled={!validChain}
                    >
                      Harvest
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col md={6} sm={2} xs={2}></Col>
        </>
      )
    );
  }, [
    rewardTokens,
    rewardDebt,
    validChain,
    rewardLoading,
    rewardCost,
    handleHarvest,
    handleExponential,
    fetchRewardAmount,
  ]);

  const cardTitle = useMemo(
    () => (
      <h5>
        <Tooltip title="Refresh Information">
          <ReloadOutlined onClick={() => fetchTokensAmount()} />
        </Tooltip>{" "}
        {TokenAddress.CAKE_LP_TOKEN.symbol}
      </h5>
    ),
    [fetchTokensAmount]
  );

  const cardExtra = useMemo(
    () => (
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
    ),
    [changeActionType]
  );

  return (
    <>
      {header}

      <Row>
        <Col md={6} sm={2} xs={2}></Col>
        <Col md={12} sm={20} xs={20}>
          <Card title={cardTitle} extra={cardExtra} loading={loading}>
            {actionType === ACTION_TYPE.DEPOSIT ? depositForm : withdrawForm}
          </Card>
        </Col>
        <Col md={6} sm={2} xs={2}></Col>
        {rewardForm}
      </Row>

      {contextHolder}
      {messageContextHolder}
    </>
  );
};

export default App;
