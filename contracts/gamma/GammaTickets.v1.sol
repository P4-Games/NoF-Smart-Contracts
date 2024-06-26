// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LibControlMgmt} from "../libs/LibControlMgmt.sol";
import {console} from "hardhat/console.sol";

error OnlyGammaContractsCanCall();
error OnlyOwners();
error InvalidAddress();
error NoTicketsAvailable();

interface IGammaCardsContract {}
interface IgammaPacksContract {}

contract NofGammaTicketsV1 is Ownable {
    using LibControlMgmt for LibControlMgmt.Data;

    IGammaCardsContract public gammaCardsContract;
    IgammaPacksContract public gammaPacksContract;

    LibControlMgmt.Data private ownersData;

    struct Ticket {
        uint256 timestamp;
        bytes32 ticketId;
        uint256 ticketCounter;
        address user;
    }

    Ticket[] public tickets;
    Ticket public winner;
    mapping(address => Ticket[]) public ticketsByUser;
    uint256 public ticketsTotalCounter = 0;

    event NewGammaCardsContract(address newGammaCardsContract);
    event NewGammaPacksContract(address newGammaPacksContract);
    event TicketGenerated(uint256 timestamp, bytes32 ticketId, uint256 ticketCounter, address indexed user);
    event WinnerObtained(uint256 timestamp, bytes32 ticketId, uint256 ticketCounter, address user);
    event AllTicketsRemoved();

    modifier onlyCardsContract {
        if(msg.sender != address(gammaCardsContract)) revert OnlyGammaContractsCanCall();
        _;
    }

    modifier onlyGammaPacksContract {
        if(msg.sender != address(gammaPacksContract)) revert OnlyGammaContractsCanCall();
        _;
    }

    modifier onlyOwners() {
        if(!ownersData.owners[msg.sender]) revert OnlyOwners();
        _;
    }

    function init (address _gammaPacksContract, address _gammaCardsContract) external onlyOwner {
        if(_gammaPacksContract == address(0) || _gammaCardsContract == address(0)) revert InvalidAddress();
        gammaPacksContract = IgammaPacksContract(_gammaPacksContract);
        gammaCardsContract = IGammaCardsContract(_gammaCardsContract);
        ownersData.owners[msg.sender] = true;
    }

    function addOwner(address _newOwner) external onlyOwners {
        ownersData.addOwner(_newOwner);
    }

    function removeOwner(address _ownerToRemove) external onlyOwners {
        ownersData.removeOwner(_ownerToRemove);
    }

    function setGammaCardsContract(address _gammaCardsContract) public onlyOwners {
        if(_gammaCardsContract == address(0)) revert InvalidAddress();
        gammaCardsContract = IGammaCardsContract(_gammaCardsContract);
        emit NewGammaCardsContract(_gammaCardsContract);
    }

    function setGammaPacksContract(address _gammaPacksContract) public onlyOwners {
        if(_gammaPacksContract == address(0)) revert InvalidAddress();
        gammaPacksContract = IgammaPacksContract(_gammaPacksContract);
        emit NewGammaPacksContract(_gammaPacksContract);
    }

    function isOwner(address user) external view returns (bool) {
        return ownersData.owners[user];
    }

    function getTickets() external view returns (Ticket[] memory) {
        return tickets;
    }

    function getTicketsByUser(address user) external view returns (Ticket[] memory) {
        return ticketsByUser[user];
    }

    function getWinner() external view returns (uint256 timestamp, bytes32 ticketId, uint256 ticketCounter, address user) {
        return (winner.timestamp, winner.ticketId, winner.ticketCounter, winner.user);
    }

    function generateTicket(address user) external onlyCardsContract {
        uint256 ticketCounter = ticketsTotalCounter;
        uint256 time = block.timestamp;
        bytes32 ticketId = keccak256(abi.encodePacked(time, ticketCounter, user));
        Ticket memory newTicket = Ticket(time, ticketId, ticketCounter, user);
        tickets.push(newTicket);
        ticketsByUser[user].push(newTicket);
        ticketsTotalCounter++;
        emit TicketGenerated(time, ticketId, ticketCounter, user);
    }

   function getLotteryWinner() external onlyGammaPacksContract 
        returns (uint256 timestamp, bytes32 ticketId, uint256 ticketCounter, address user) {
        if(tickets.length == 0) revert NoTicketsAvailable();

        if (winner.timestamp != 0) {
            return (winner.timestamp, winner.ticketId, winner.ticketCounter, winner.user);
        }

        uint256 randomNumber = uint256(keccak256(abi.encode(block.timestamp, block.prevrandao, tickets.length))) % tickets.length;
        winner = tickets[randomNumber];
        
        emit WinnerObtained(winner.timestamp, winner.ticketId, winner.ticketCounter, winner.user);
        return (winner.timestamp, winner.ticketId, winner.ticketCounter, winner.user);
    }

    function deleteAllTickets() external onlyGammaPacksContract {
       delete tickets;
        ticketsTotalCounter = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            delete ticketsByUser[tickets[i].user];
        }
        emit AllTicketsRemoved();
    }
}
