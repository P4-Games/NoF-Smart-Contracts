// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/LibControlMgmt.sol";
import "hardhat/console.sol";

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
        require(msg.sender == address(gammaCardsContract), "Only gamma cards contract can call this function.");
        _;
    }

    modifier onlyGammaPacksContract {
        require(msg.sender == address(gammaPacksContract), "Only gamma packs contract can call this function.");
        _;
    }

    modifier onlyOwners() {
        require(ownersData.owners[msg.sender], "Only owners.");
        _;
    }

    function init (address _gammaPacksContract, address _gammaCardsContract) external onlyOwner {
        require(_gammaPacksContract != address(0), "Invalid address.");
        require(_gammaCardsContract != address(0), "Invalid address.");
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
        require(_gammaCardsContract != address(0), "Invalid address.");
        gammaCardsContract = IGammaCardsContract(_gammaCardsContract);
        emit NewGammaCardsContract(_gammaCardsContract);
    }

    function setGammaPacksContract(address _gammaPacksContract) public onlyOwners {
        require(_gammaPacksContract != address(0), "Invalid address.");
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
        require(tickets.length > 0, "No tickets available for the lottery.");

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
