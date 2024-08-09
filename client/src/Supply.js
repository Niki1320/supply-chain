import React, { useState, useEffect } from 'react';
import { useHistory } from "react-router-dom";
import Web3 from "web3";
import SupplyChainABI from "./artifacts/SupplyChain.json";
import "./supply.css";

function Supply() {
    const history = useHistory();

    useEffect(() => {
        loadWeb3();
        loadBlockchainData();
    }, []);

    const [currentAccount, setCurrentAccount] = useState("");
    const [loader, setLoader] = useState(true);
    const [supplyChain, setSupplyChain] = useState();
    const [medData, setMedData] = useState({});
    const [medStage, setMedStage] = useState({});
    const [id, setId] = useState("");
    const [error, setError] = useState("");

    const loadWeb3 = async () => {
        if (window.ethereum) {
            window.web3 = new Web3(window.ethereum);
            await window.ethereum.enable();
        } else if (window.web3) {
            window.web3 = new Web3(window.web3.currentProvider);
        } else {
            window.alert("Non-Ethereum browser detected. You should consider trying MetaMask!");
        }
    };

    const loadBlockchainData = async () => {
        setLoader(true);
        const web3 = window.web3;
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        setCurrentAccount(account);
        const networkId = await web3.eth.net.getId();
        const networkData = SupplyChainABI.networks[networkId];
        if (networkData) {
            const supplychain = new web3.eth.Contract(SupplyChainABI.abi, networkData.address);
            setSupplyChain(supplychain);
            const medCtr = await supplychain.methods.medicineCtr().call();
            const med = {};
            const medStage = {};
            for (let i = 0; i < medCtr; i++) {
                const medId = i + 1;
                med[medId] = await supplychain.methods.MedicineStock(medId).call();
                medStage[medId] = await supplychain.methods.showStage(medId).call();
            }
            setMedData(med);
            setMedStage(medStage);
            setLoader(false);
        } else {
            window.alert('The smart contract is not deployed to the current network');
        }
    };

    if (loader) {
        return (
            <div className="container">
                <h1 className="wait">Loading...</h1>
            </div>
        );
    }

    const redirectToHome = () => {
        history.push('/');
    };

    const handleIdChange = (event) => {
        setId(event.target.value);
    };

    const calculatePayment = (price, quantity) => {
        const priceInWei = Web3.utils.toWei(price.toString(), 'ether');
        const paymentAmount = Web3.utils.toBN(priceInWei).mul(Web3.utils.toBN(quantity));
        return paymentAmount.toString();
    };

    const handleSubmit = async (event, methodName) => {
        event.preventDefault();
        setError("");
    
        try {
            const productId = parseInt(id, 10);
            if (isNaN(productId)) {
                throw new Error("Invalid Product ID");
            }

            const method = supplyChain.methods[methodName];
            if (!method) {
                throw new Error(`Method ${methodName} does not exist on the smart contract.`);
            }

            const product = await supplyChain.methods.MedicineStock(productId).call();
            const price = Web3.utils.fromWei(product.price, 'ether');
            const quantity = product.quantity;
            const paymentAmount = calculatePayment(price, quantity);

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
    
            let gasEstimate;
            try {
                gasEstimate = await method(productId).estimateGas({ from: account });
            } catch (error) {
                console.error("Gas estimation failed:", error);
                gasEstimate = 3000000; // Fallback gas limit
            }
    
            const result = await method(productId).send({
                from: account,
                gas: gasEstimate,
                value: paymentAmount
            });
    
            console.log(`Successfully called ${methodName} with result:`, result);
            alert(`Successfully called ${methodName} with result: ${result.transactionHash}`);
    
            setId("");
        } catch (error) {
            console.error(`Error in ${methodName}:`, error);
            setError(`Error in ${methodName}: ${error.message}`);
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return {
            date: date.toLocaleDateString(),
            dateTime: date.toLocaleString()
        };
    };

    return (
        <div className='container'>
            <span><b>Current Account Address:</b> {currentAccount}</span>
            <span onClick={redirectToHome} className="btn btn-outline-danger btn-sm btn-home"> HOME</span>
            
            <table className="table table-sm table-dark">
                <thead>
                    <tr>
                        <th scope="col">Product ID</th>
                        <th scope="col">Name</th>
                        <th scope="col">Destination</th>
                        <th scope="col">Price</th>
                        <th scope="col">Quantity</th>
                        <th scope="col">Expiration Date</th>
                        <th scope="col">Timestamp</th>
                        <th scope="col">Current Processing Stage</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(medData).map((key) => {
                        const { date, dateTime } = formatDate(medData[key].timestamp);
                        return (
                            <tr key={key}>
                                <td>{medData[key].id}</td>
                                <td>{medData[key].name}</td>
                                <td>{medData[key].destinationCompanyName}</td>
                                <td>{Web3.utils.fromWei(medData[key].price, 'ether')}</td>
                                <td>{medData[key].quantity}</td>
                                <td>{new Date(medData[key].expirationDate * 1000).toLocaleDateString()}</td>
                                <td>{dateTime}</td>
                                <td>{medStage[key]}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="step">
                <h5><b>Step 1: Manufacturing</b></h5>
                <form onSubmit={(event) => handleSubmit(event, 'startManufacturing')}>
                    <div className="form-group">
                        <input
                            type="text"
                            id="ID"
                            value={id}
                            onChange={handleIdChange}
                            className="form-control-sm"
                            placeholder="Enter Product ID"
                        />
                        <button type="submit" className="btn btn-primary btn-submit">Manufacture Product</button>
                    </div>
                </form>
            </div>

            <div className="step">
                <h5><b>Step 2: Shipping</b></h5>
                <form onSubmit={(event) => handleSubmit(event, 'startShipping')}>
                    <div className="form-group">
                        <input
                            type="text"
                            id="ID"
                            value={id}
                            onChange={handleIdChange}
                            className="form-control-sm"
                            placeholder="Enter Product ID"
                        />
                        <button type="submit" className="btn btn-primary btn-submit">Ship Product</button>
                    </div>
                </form>
            </div>

            <div className="step">
                <h5><b>Step 3: Distribution</b></h5>
                <form onSubmit={(event) => handleSubmit(event, 'startDistribution')}>
                    <div className="form-group">
                        <input
                            type="text"
                            id="ID"
                            value={id}
                            onChange={handleIdChange}
                            className="form-control-sm"
                            placeholder="Enter Product ID"
                        />
                        <button type="submit" className="btn btn-primary btn-submit">Distribute Product</button>
                    </div>
                </form>
            </div>

            <div className="step">
                <h5><b>Step 4: Warehouse</b></h5>
                <form onSubmit={(event) => handleSubmit(event, 'storeInWarehouse')}>
                    <div className="form-group">
                        <input
                            type="text"
                            id="ID"
                            value={id}
                            onChange={handleIdChange}
                            className="form-control-sm"
                            placeholder="Enter Product ID"
                        />
                        <button type="submit" className="btn btn-primary btn-submit">Store in Warehouse</button>
                    </div>
                </form>
            </div>

            {error && <p className="text-danger">{error}</p>}
        </div>
    );
}

export default Supply;
