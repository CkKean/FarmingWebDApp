import { useEffect, useMemo, useState } from "react";
import {
  Button,
  ButtonGroup,
  Card,
  Col,
  Form,
  Row,
  Container,
  DropdownButton,
  Dropdown,
} from "react-bootstrap";
import Web3 from "web3";
import { ContractAddress } from "./constants/contractsAddresses";
import { RestakingFarmAbi } from "./constants/farmContractAbi";
import { PurseBusdPoolAbi } from "./constants/purseBusdPoolAbi";

const ACTION_TYPE = {
  DEPOSIT: 1,
  WITHDRAW: 2,
};

const App = () => {
  const [web3, setWeb3] = useState<Web3>(
    new Web3("https://bsc-dataseed.binance.org/")
  );
  const [farmContract, setFarmContract] = useState<any>(null);
  const [poolContract, setPoolContract] = useState<any>(null);
  const [account, setAccount] = useState("");
  const [validAllowance, setValidAllowance] = useState<boolean>(false);
  const [allowance, setAllowance] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [stakedToken, setStakedToken] = useState<number>(0);
  const [rewardTokens, setRewardTokens] = useState("");
  const [actionType, setActionType] = useState<number>(ACTION_TYPE.DEPOSIT);

  useEffect(() => {
    initializeWeb3();
    initializeContract();
  }, []);

  const initializeWeb3 = async () => {
    if (window.ethereum) {
      try {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.enable();
        setWeb3(web3);
      } catch (error) {
        console.error(error);
      }
    } else {
      console.error("Web3 not found in your browser.");
    }
  };

  const initializeContract = async () => {
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
    } catch (error) {
      console.error(error);
    }
  };

  const checkAllowance = async (accountWallet?: string, amount: number = 0) => {
    try {
      console.log({
        farmAddress: ContractAddress.FARM.address,
        account,
        accountWallet,
      });

      if (account || accountWallet) {
        if (amount > 0) {
        } else {
          const allowanceResult = await poolContract.methods
            .allowance(account, ContractAddress.FARM.address)
            .call();
          const allowanceInEther = Number(
            web3.utils.fromWei(allowanceResult, "ether")
          );
          setAllowance(allowanceInEther);
          setValidAllowance(allowanceResult !== 0);
        }
      } else {
        alert("Please connect wallet.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const checkAccountFarmInfo = async () => {
    try {
      if (account) {
        let { amount, rewardDebt } = await farmContract.methods
          .userInfo(account, account)
          .call();
        setStakedToken(Number(amount));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeposit = async () => {
    try {
      if (depositAmount > allowance) {
        alert("Your allowance not enough. Please approve it.");
        return;
      }

      const depositResult = await farmContract.methods
        .deposit(
          ContractAddress.PURSE_BUSD.address,
          web3.utils.toWei(depositAmount, "ether")
        )
        .send({ from: account });
    } catch (error) {
      console.error(error);
    }
  };

  const handleWithdraw = async () => {
    try {
      if (depositAmount > allowance) {
        alert("Your allowance not enough. Please approve it.");
        return;
      }

      let lpTokenBalance = await poolContract.methods.balanceOf(account).call();

      if (lpTokenBalance) {
        lpTokenBalance = web3.utils.toWei(lpTokenBalance, "ether");

        const depositResult = await farmContract.methods
          .withdraw(
            ContractAddress.PURSE_BUSD.address,
            web3.utils.toWei(depositAmount, "ether")
          )
          .send({ from: account });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleClaimReward = async () => {
    try {
      // await contract.methods.claimReward().send({ from: account });
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    if (web3) {
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);
      checkAllowance(accounts[0]);
    }
  };

  const depositForm = useMemo(() => {
    return (
      <>
        {validAllowance ? (
          <>
            <Form.Label htmlFor="lpTokensInput">Deposit Amount:</Form.Label>
            <Form.Control
              type="number"
              id="lpTokensInput"
              aria-describedby="lpTokens"
              placeholder="Enter LP Tokens"
              onChange={(e) => setDepositAmount(Number(e.target.value))}
            />
            <Form.Text id="lpTokens" muted>
              Your password must be 8-20 characters long, contain letters and
              numbers, and must not contain spaces, special characters, or
              emoji.
            </Form.Text>

            <Button variant="primary">Deposit</Button>
          </>
        ) : (
          <Button variant="primary">Approve</Button>
        )}
      </>
    );
  }, []);

  const withdrawForm = useMemo(() => {
    return (
      <>
        <Form.Label htmlFor="withdrawTokenInput">Amount</Form.Label>
        <Form.Control
          type="number"
          id="withdrawTokenInput"
          aria-describedby="lpTokens"
          placeholder="Enter LP Tokens"
          onChange={(e) => setDepositAmount(Number(e.target.value))}
        />
        <Form.Text id="withdrawToken" muted className={"float-right"}>
          Balance: {stakedToken}
        </Form.Text>
      </>
    );
  }, []);

  const changeActionType = (type: number) => {
    setActionType(type);
    if (type === ACTION_TYPE.WITHDRAW) {
      checkAccountFarmInfo();
    }
  };

  return (
    <Container className={"mt-3"}>
      <Row className={"mb-3"}>
        <Col md={3}></Col>
        <Col md={6} className={"text-center"}>
          <h3>Pundi X Interview Assignment</h3>
        </Col>
        <Col md={3} style={{ textAlign: "right" }}>
          {account ? (
            <DropdownButton id="account-dropdown" title={account}>
              <Dropdown.Item as="button">Disconnect</Dropdown.Item>
            </DropdownButton>
          ) : (
            <Button onClick={connectWallet} variant="primary">
              Connect Wallet
            </Button>
          )}
        </Col>
      </Row>
      <Row>
        <Col md={{ span: 6, offset: 3 }}>
          <Card>
            <Card.Header>
              <Row className={"align-items-center justify-content-between"}>
                <Col>
                  <h5>Deposit LP Token</h5>
                </Col>
                <Col style={{ textAlign: "right" }}>
                  <ButtonGroup>
                    <Button
                      variant={
                        actionType === ACTION_TYPE.DEPOSIT ? "primary" : "light"
                      }
                      onClick={() => changeActionType(ACTION_TYPE.DEPOSIT)}
                      active
                    >
                      Deposit
                    </Button>
                    <Button
                      variant={
                        actionType === ACTION_TYPE.WITHDRAW
                          ? "primary"
                          : "light"
                      }
                      onClick={() => changeActionType(ACTION_TYPE.WITHDRAW)}
                      active
                    >
                      Withdraw
                    </Button>
                  </ButtonGroup>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              {actionType === ACTION_TYPE.DEPOSIT ? depositForm : withdrawForm}
            </Card.Body>
            <Card.Footer>Rewards</Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default App;
