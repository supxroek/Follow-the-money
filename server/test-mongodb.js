// MongoDB Connection and Data Test Script
import { connectDB, disconnectDB } from './src/config/database.js';
import User from './src/models/User.js';
import Group from './src/models/Group.js';
import Expense from './src/models/Expense.js';
import Debt from './src/models/Debt.js';
import { logger } from './src/utils/logger.js';

async function testMongoDB() {
  try {
    console.log('🧪 Starting MongoDB Test...\n');
    
    // Connect to database
    await connectDB();
    
    // Test 1: Clear existing test data
    console.log('🧹 Clearing existing test data...');
    await User.deleteMany({ email: { $regex: /@test\.com$/ } });
    await Group.deleteMany({ name: { $regex: /^Test/ } });
    console.log('✅ Test data cleared\n');
    
    // Test 2: Create test users
    console.log('👥 Creating test users...');
    const testUsers = [
      {
        lineUserId: 'test_user_1',
        displayName: 'John Doe',
        email: 'john@test.com',
        promptPayId: '0881234567'
      },
      {
        lineUserId: 'test_user_2', 
        displayName: 'Jane Smith',
        email: 'jane@test.com',
        promptPayId: '0889876543'
      },
      {
        lineUserId: 'test_user_3',
        displayName: 'Bob Wilson',
        email: 'bob@test.com',
        bankAccount: {
          bankName: 'Kasikorn Bank',
          accountNumber: '1234567890',
          accountName: 'Bob Wilson'
        }
      }
    ];
    
    const createdUsers = await User.insertMany(testUsers);
    console.log(`✅ Created ${createdUsers.length} test users`);
    
    // Test 3: Create test group
    console.log('\n🏠 Creating test group...');
    const testGroup = new Group({
      name: 'Test Friends Group',
      description: 'A test group for expense sharing',
      groupType: 'friends',
      currency: 'THB',
      members: createdUsers.map(user => ({
        user: user._id,
        role: user.lineUserId === 'test_user_1' ? 'admin' : 'member'
      })),
      createdBy: createdUsers[0]._id
    });
    
    const savedGroup = await testGroup.save();
    console.log('✅ Created test group:', savedGroup.name);
    
    // Update users with group reference
    await User.updateMany(
      { _id: { $in: createdUsers.map(u => u._id) } },
      { $push: { groups: savedGroup._id } }
    );
    
    // Test 4: Create test expense
    console.log('\n💰 Creating test expense...');
    const testExpense = new Expense({
      title: 'Dinner at Restaurant',
      description: 'Group dinner for celebrating birthday',
      amount: 1200,
      currency: 'THB',
      category: 'food',
      paidBy: createdUsers[0]._id,
      group: savedGroup._id,
      expenseDate: new Date()
    });
    
    // Calculate equal splits
    testExpense.calculateEqualSplits(createdUsers.map(u => u._id));
    const savedExpense = await testExpense.save();
    console.log('✅ Created test expense:', savedExpense.title);
    console.log(`   Amount: ${savedExpense.amount} ${savedExpense.currency}`);
    console.log(`   Splits: ${savedExpense.splits.length} members`);
    
    // Test 5: Create debts from expense
    console.log('\n📊 Creating debts from expense...');
    const debts = [];
    
    for (const split of savedExpense.splits) {
      if (split.user.toString() !== savedExpense.paidBy.toString()) {
        const debt = new Debt({
          debtor: split.user,
          creditor: savedExpense.paidBy,
          expense: savedExpense._id,
          group: savedGroup._id,
          amount: split.amount,
          originalAmount: split.amount,
          currency: savedExpense.currency
        });
        debts.push(debt);
      }
    }
    
    const savedDebts = await Debt.insertMany(debts);
    console.log(`✅ Created ${savedDebts.length} debt records`);
    
    // Test 6: Query data
    console.log('\n🔍 Testing data queries...');
    
    // Find users by group
    const groupUsers = await User.findByGroup(savedGroup._id);
    console.log(`✅ Found ${groupUsers.length} users in group`);
    
    // Find expenses by group
    const groupExpenses = await Expense.findByGroup(savedGroup._id);
    console.log(`✅ Found ${groupExpenses.length} expenses in group`);
    
    // Find debts by debtor
    const userDebts = await Debt.findByDebtor(createdUsers[1]._id);
    console.log(`✅ Found ${userDebts.length} debts for user`);
    
    // Get debt summary
    const debtSummary = await Debt.getDebtSummary(createdUsers[0]._id);
    console.log('✅ Debt summary:', debtSummary);
    
    // Test 7: Update group stats
    console.log('\n📈 Updating group statistics...');
    await savedGroup.updateStats();
    const updatedGroup = await Group.findById(savedGroup._id);
    console.log('✅ Group stats updated:');
    console.log(`   Total Expenses: ${updatedGroup.stats.totalExpenses}`);
    console.log(`   Total Amount: ${updatedGroup.stats.totalAmount} THB`);
    console.log(`   Active Debts: ${updatedGroup.stats.activeDebts}`);
    
    // Test 8: Test payment
    console.log('\n💳 Testing payment...');
    const debtToPay = savedDebts[0];
    await debtToPay.markAsPaid('promptpay');
    console.log('✅ Marked debt as paid');
    
    // Test 9: Test partial payment
    console.log('\n💰 Testing partial payment...');
    if (savedDebts.length > 1) {
      const debtForPartial = savedDebts[1];
      await debtForPartial.addPartialPayment(200, 'Partial payment test');
      console.log(`✅ Added partial payment of 200 THB`);
      console.log(`   Remaining: ${debtForPartial.remainingAmount} THB`);
    }
    
    // Test 10: Collection stats
    console.log('\n📊 Database Statistics:');
    const stats = await Promise.all([
      User.countDocuments(),
      Group.countDocuments(),
      Expense.countDocuments(),
      Debt.countDocuments()
    ]);
    
    console.log(`   Users: ${stats[0]}`);
    console.log(`   Groups: ${stats[1]}`);
    console.log(`   Expenses: ${stats[2]}`);
    console.log(`   Debts: ${stats[3]}`);
    
    console.log('\n🎉 MongoDB test completed successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB test failed:', error);
  } finally {
    await disconnectDB();
  }
}

// Run the test
testMongoDB();
