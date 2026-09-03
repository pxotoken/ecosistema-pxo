// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IUpgradedToken {
    function transferByLegacy(address from, address to, uint256 value) external;
    function transferFromByLegacy(address sender, address from, address to, uint256 value) external;
    function approveByLegacy(address from, address spender, uint256 value) external;
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract PXOToken is ERC20, ERC20Burnable, Ownable, Pausable {
    uint256 public basisPointsRate = 0;
    uint256 public maximumFee = 0;
    bool public deprecated = false;
    address public upgradedAddress;

    mapping(address => bool) public isBlackListed;
    mapping(address => bool) public isMinter;
    mapping(address => bool) public isBurner;
    mapping(address => bool) public isBlacklister;
    mapping(address => bool) public isFeeSetter;

    uint8 private decimals_;

    event DestroyedBlackFunds(address indexed user, uint256 balance);
    event AddedBlackList(address indexed user);
    event RemovedBlackList(address indexed user);
    event Deprecate(address newAddress);
    event Params(uint256 feeBasisPoints, uint256 maxFee);
    event Issue(uint256 amount);
    event Redeem(uint256 amount);
    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);
    event BurnerAdded(address indexed account);
    event BurnerRemoved(address indexed account);
    event BlacklisterAdded(address indexed account);
    event BlacklisterRemoved(address indexed account);
    event FeeSetterAdded(address indexed account);
    event FeeSetterRemoved(address indexed account);

    modifier notBlackListed(address account) {
        require(!isBlackListed[account], "Blacklisted address");
        _;
    }

    modifier onlyMinter() {
        require(isMinter[msg.sender] || msg.sender == owner(), "Caller is not a minter");
        _;
    }

    modifier onlyBurner() {
        require(isBurner[msg.sender] || msg.sender == owner(), "Caller is not a burner");
        _;
    }

    modifier onlyBlacklister() {
        require(isBlacklister[msg.sender] || msg.sender == owner(), "Caller is not a blacklister");
        _;
    }

    modifier onlyFeeSetter() {
        require(isFeeSetter[msg.sender] || msg.sender == owner(), "Caller is not a fee setter");
        _;
    }

    constructor(
        uint256 _initialSupply,
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address initialOwner
    ) ERC20(_name, _symbol) Ownable(initialOwner) {
        _mint(initialOwner, _initialSupply);
        decimals_ = _decimals;
    }



    function decimals() public view override returns (uint8) {
        return decimals_;
    }

    function setParams(uint256 newBasisPoints, uint256 newMaxFee) external onlyFeeSetter {
        require(newBasisPoints < 20, "Basis points too high");
        require(newMaxFee < 50 * (10**decimals()), "Max fee too high");
        basisPointsRate = newBasisPoints;
        maximumFee = newMaxFee;
        emit Params(newBasisPoints, newMaxFee);
    }

    function _calculateFee(uint256 amount) internal view returns (uint256 fee) {
        fee = (amount * basisPointsRate) / 10000;
        if (fee > maximumFee) {
            fee = maximumFee;
        }
        return fee;
    }

    function transfer(address to, uint256 amount) public override whenNotPaused notBlackListed(msg.sender) returns (bool) {
        if (deprecated) {
            IUpgradedToken(upgradedAddress).transferByLegacy(msg.sender, to, amount);
            return true;
        }
        uint256 fee = _calculateFee(amount);
        uint256 sendAmount = amount - fee;
        _transfer(_msgSender(), to, sendAmount);
        if (fee > 0) _transfer(_msgSender(), owner(), fee);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused notBlackListed(from) returns (bool) {
        if (deprecated) {
            IUpgradedToken(upgradedAddress).transferFromByLegacy(msg.sender, from, to, amount);
            return true;
        }
        uint256 fee = _calculateFee(amount);
        uint256 sendAmount = amount - fee;
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, sendAmount);
        if (fee > 0) _transfer(from, owner(), fee);
        return true;
    }

    function approve(address spender, uint256 amount) public override whenNotPaused returns (bool) {
        if (deprecated) {
            IUpgradedToken(upgradedAddress).approveByLegacy(msg.sender, spender, amount);
            return true;
        }
        return super.approve(spender, amount);
    }

    function addBlackList(address user) external onlyBlacklister {
        isBlackListed[user] = true;
        emit AddedBlackList(user);
    }
    /**
     * @dev Agrega múltiples direcciones a la lista negra en una sola llamada.
     * Solo puede ser llamado por un blacklister autorizado.
     * @param users Lista de direcciones a agregar a la blacklist.
     */
    function addBlackListBatch(address[] calldata users) external onlyBlacklister {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            isBlackListed[user] = true;
            emit AddedBlackList(user);
        }
    }

    /**
     * @dev Elimina múltiples direcciones de la lista negra en una sola llamada.
     * Solo puede ser llamado por un blacklister autorizado.
     * @param users Lista de direcciones a remover de la blacklist.
     */
    function removeBlackListBatch(address[] calldata users) external onlyBlacklister {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            isBlackListed[user] = false;
            emit RemovedBlackList(user);
        }
    }

    function removeBlackList(address user) external onlyBlacklister {
        isBlackListed[user] = false;
        emit RemovedBlackList(user);
    }

    function destroyBlackFunds(address user) external onlyBlacklister {
        require(isBlackListed[user], "User is not blacklisted");
        uint256 dirtyFunds = balanceOf(user);
        _burn(user, dirtyFunds);
        emit DestroyedBlackFunds(user, dirtyFunds);
    }

    function deprecate(address newAddress) external onlyOwner {
        deprecated = true;
        upgradedAddress = newAddress;
        emit Deprecate(newAddress);
    }

    function addMinter(address account) external onlyOwner {
        isMinter[account] = true;
        emit MinterAdded(account);
    }

    function removeMinter(address account) external onlyOwner {
        isMinter[account] = false;
        emit MinterRemoved(account);
    }

    function addBurner(address account) external onlyOwner {
        isBurner[account] = true;
        emit BurnerAdded(account);
    }

    function removeBurner(address account) external onlyOwner {
        isBurner[account] = false;
        emit BurnerRemoved(account);
    }

    function addBlacklister(address account) external onlyOwner {
        isBlacklister[account] = true;
        emit BlacklisterAdded(account);
    }

    function removeBlacklister(address account) external onlyOwner {
        isBlacklister[account] = false;
        emit BlacklisterRemoved(account);
    }

    function addFeeSetter(address account) external onlyOwner {
        isFeeSetter[account] = true;
        emit FeeSetterAdded(account);
    }

    function removeFeeSetter(address account) external onlyOwner {
        isFeeSetter[account] = false;
        emit FeeSetterRemoved(account);
    }

    function mint(address to, uint256 amount) external onlyMinter whenNotPaused {
        _mint(to, amount);
        emit Issue(amount);
    }

    function burnFrom(address account, uint256 amount) public override onlyBurner whenNotPaused {
        super.burnFrom(account, amount);
        emit Redeem(amount);
    }

    function issue(uint256 amount) external onlyOwner {
        _mint(owner(), amount);
        emit Issue(amount);
    }

    function redeem(uint256 amount) external onlyOwner {
        _burn(owner(), amount);
        emit Redeem(amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function totalSupply() public view override returns (uint256) {
        if (deprecated) {
            return IUpgradedToken(upgradedAddress).totalSupply();
        } else {
            return super.totalSupply();
        }
    }

    function balanceOf(address account) public view override returns (uint256) {
        if (deprecated) {
            return IUpgradedToken(upgradedAddress).balanceOf(account);
        } else {
            return super.balanceOf(account);
        }
    }

    function allowance(address owner_, address spender) public view override returns (uint256) {
        if (deprecated) {
            return IUpgradedToken(upgradedAddress).allowance(owner_, spender);
        } else {
            return super.allowance(owner_, spender);
        }
    }

    function hasRole(address account, uint8 role) public view returns (bool) {
        if (account == owner()) return true;
        if (role == 1) return isMinter[account];
        if (role == 2) return isBurner[account];
        if (role == 3) return isBlacklister[account];
        if (role == 4) return isFeeSetter[account];
        return false;
    }

    function getRoles(address account) public view returns (bool[] memory roles) {
        roles = new bool[](4);
        roles[0] = isMinter[account] || account == owner();
        roles[1] = isBurner[account] || account == owner();
        roles[2] = isBlacklister[account] || account == owner();
        roles[3] = isFeeSetter[account] || account == owner();
    }
}