// Comprehensive Sample Data Creation Script
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './src/config/database.js';

// Load environment variables
dotenv.config();
import User from './src/models/User.js';
import Group from './src/models/Group.js';
import Expense from './src/models/Expense.js';
import Debt from './src/models/Debt.js';
import { logger } from './src/utils/logger.js';

async function createSampleData() {
  try {
    console.log('🚀 Creating comprehensive sample data...\n');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Group.deleteMany({});
    await Expense.deleteMany({});
    await Debt.deleteMany({});
    console.log('✅ Data cleared\n');
    
    // Create Users
    console.log('👥 Creating users...');
    const users = [
      {
        lineUserId: 'admin_user_001',
        displayName: 'Admin Suparoek',
        email: 'admin@example.com',
        pictureUrl: 'https://via.placeholder.com/150/0099cc/ffffff?text=AS',
        promptPayId: '0881234567',
        role: 'admin'
      },
      {
        lineUserId: 'john_doe_002',
        displayName: 'John Doe',
        email: 'john@example.com',
        pictureUrl: 'https://via.placeholder.com/150/33cc33/ffffff?text=JD',
        promptPayId: '0887654321'
      },
      {
        lineUserId: 'jane_smith_003',
        displayName: 'Jane Smith',
        email: 'jane@example.com',
        pictureUrl: 'https://via.placeholder.com/150/ff6633/ffffff?text=JS',
        bankAccount: {
          bankName: 'Bangkok Bank',
          accountNumber: '123-456-7890',
          accountName: 'Jane Smith'
        }
      },
      {
        lineUserId: 'bob_wilson_004',
        displayName: 'Bob Wilson',
        email: 'bob@example.com',
        pictureUrl: 'https://via.placeholder.com/150/6633ff/ffffff?text=BW',
        promptPayId: '0899876543'
      },
      {
        lineUserId: 'alice_brown_005',
        displayName: 'Alice Brown',
        email: 'alice@example.com',
        pictureUrl: 'https://via.placeholder.com/150/ff3366/ffffff?text=AB',
        promptPayId: '0866666666'
      }
    ];
    
    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} users`);
    
    // Create Groups
    console.log('\n🏠 Creating groups...');
    const groups = [
      {
        name: 'Bangkok Friends',
        description: 'Our close friend group in Bangkok',
        groupType: 'friends',
        currency: 'THB',
        imageUrl: 'https://via.placeholder.com/300/0099cc/ffffff?text=Bangkok+Friends',
        members: [
          { user: createdUsers[0]._id, role: 'admin' },
          { user: createdUsers[1]._id, role: 'member' },
          { user: createdUsers[2]._id, role: 'member' },
          { user: createdUsers[3]._id, role: 'member' }
        ],
        createdBy: createdUsers[0]._id,
        settings: {
          autoReminders: true,
          reminderInterval: 24,
          allowMemberInvites: true,
          requireApprovalForExpenses: false,
          defaultSplitMethod: 'equal'
        }
      },
      {
        name: 'Office Team',
        description: 'Work colleagues group for lunch and events',
        groupType: 'other',
        currency: 'THB',
        imageUrl: 'https://via.placeholder.com/300/33cc33/ffffff?text=Office+Team',
        members: [
          { user: createdUsers[0]._id, role: 'admin' },
          { user: createdUsers[1]._id, role: 'member' },
          { user: createdUsers[4]._id, role: 'member' }
        ],
        createdBy: createdUsers[0]._id
      },
      {
        name: 'Roommates',
        description: 'Shared apartment expenses',
        groupType: 'roommates',
        currency: 'THB',
        imageUrl: 'https://via.placeholder.com/300/ff6633/ffffff?text=Roommates',
        members: [
          { user: createdUsers[2]._id, role: 'admin' },
          { user: createdUsers[3]._id, role: 'member' },
          { user: createdUsers[4]._id, role: 'member' }
        ],
        createdBy: createdUsers[2]._id
      }
    ];
    
    const createdGroups = await Group.insertMany(groups);
    console.log(`✅ Created ${createdGroups.length} groups`);
    
    // Update users with group references
    await User.updateMany(
      { _id: { $in: [createdUsers[0]._id, createdUsers[1]._id, createdUsers[2]._id, createdUsers[3]._id] } },
      { $push: { groups: createdGroups[0]._id } }
    );
    await User.updateMany(
      { _id: { $in: [createdUsers[0]._id, createdUsers[1]._id, createdUsers[4]._id] } },
      { $push: { groups: createdGroups[1]._id } }
    );
    await User.updateMany(
      { _id: { $in: [createdUsers[2]._id, createdUsers[3]._id, createdUsers[4]._id] } },
      { $push: { groups: createdGroups[2]._id } }
    );
    
    // Create Expenses
    console.log('\n💰 Creating expenses...');
    const expenses = [
      // Bangkok Friends Group Expenses
      {
        title: 'Birthday Dinner at Sukhumvit',
        description: 'Celebrating John\'s birthday at fancy restaurant',
        amount: 2400,
        currency: 'THB',
        category: 'food',
        paidBy: createdUsers[0]._id, // Admin
        group: createdGroups[0]._id, // Bangkok Friends
        expenseDate: new Date(Date.now() - 2 * 86400000), // 2 days ago
        location: {
          name: 'Sukhumvit Restaurant',
          latitude: 13.7563,
          longitude: 100.5018
        },
        tags: ['birthday', 'dinner', 'celebration']
      },
      {
        title: 'Movie Night Tickets',
        description: 'Avatar 3 IMAX tickets for the group',
        amount: 1200,
        currency: 'THB',
        category: 'entertainment',
        paidBy: createdUsers[1]._id, // John
        group: createdGroups[0]._id,
        expenseDate: new Date(Date.now() - 86400000), // Yesterday
        tags: ['movie', 'entertainment']
      },
      {
        title: 'Uber to Airport',
        description: 'Shared ride to Suvarnabhumi Airport',
        amount: 800,
        currency: 'THB',
        category: 'transport',
        paidBy: createdUsers[2]._id, // Jane
        group: createdGroups[0]._id,
        expenseDate: new Date(Date.now() - 3 * 86400000), // 3 days ago
        tags: ['transport', 'airport']
      },
      
      // Office Team Expenses
      {
        title: 'Team Lunch',
        description: 'Monthly team lunch at MBK food court',
        amount: 900,
        currency: 'THB',
        category: 'food',
        paidBy: createdUsers[0]._id, // Admin
        group: createdGroups[1]._id, // Office Team
        expenseDate: new Date(),
        tags: ['lunch', 'team']
      },
      {
        title: 'Office Coffee Supplies',
        description: 'Coffee beans and supplies for office',
        amount: 600,
        currency: 'THB',
        category: 'other',
        paidBy: createdUsers[4]._id, // Alice
        group: createdGroups[1]._id,
        expenseDate: new Date(Date.now() - 5 * 86400000), // 5 days ago
        tags: ['coffee', 'supplies']
      },
      
      // Roommates Expenses
      {
        title: 'Electricity Bill',
        description: 'Monthly electricity bill for apartment',
        amount: 1500,
        currency: 'THB',
        category: 'utilities',
        paidBy: createdUsers[2]._id, // Jane
        group: createdGroups[2]._id, // Roommates
        expenseDate: new Date(Date.now() - 7 * 86400000), // 1 week ago
        tags: ['utilities', 'monthly']
      },
      {
        title: 'Grocery Shopping',
        description: 'Weekly groceries from Big C',
        amount: 1800,
        currency: 'THB',
        category: 'groceries',
        paidBy: createdUsers[3]._id, // Bob
        group: createdGroups[2]._id,
        expenseDate: new Date(Date.now() - 4 * 86400000), // 4 days ago
        tags: ['groceries', 'weekly']
      }
    ];
    
    for (let expenseData of expenses) {
      const expense = new Expense(expenseData);
      
      // Calculate splits based on group members
      const group = createdGroups.find(g => g._id.equals(expense.group));
      const memberIds = group.members.map(m => m.user);
      
      expense.calculateEqualSplits(memberIds);
      await expense.save();
      
      // Create corresponding debts
      for (const split of expense.splits) {
        if (!split.user.equals(expense.paidBy)) {
          const debt = new Debt({
            debtor: split.user,
            creditor: expense.paidBy,
            expense: expense._id,
            group: expense.group,
            amount: split.amount,
            originalAmount: split.amount,
            currency: expense.currency,
            dueDate: new Date(Date.now() + 7 * 86400000), // 1 week from now
            priority: split.amount > 500 ? 'high' : 'medium',
            notes: `Share of ${expense.title}`
          });
          await debt.save();
        }
      }
    }
    
    console.log(`✅ Created ${expenses.length} expenses with corresponding debts`);
    
    // Simulate some payments
    console.log('\n💳 Simulating some payments...');
    const someDebts = await Debt.find({ amount: { $lt: 500 } }).limit(3);
    for (const debt of someDebts) {
      await debt.markAsPaid('promptpay');
    }
    console.log(`✅ Marked ${someDebts.length} debts as paid`);
    
    // Update group statistics
    console.log('\n📊 Updating group statistics...');
    for (const group of createdGroups) {
      await group.updateStats();
    }
    console.log('✅ Group statistics updated');
    
    // Final statistics
    console.log('\n📈 Final Database Statistics:');
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
    
    console.log('\n🎉 Sample data creation completed successfully!');
    console.log('\n📝 Test User Accounts:');
    console.log('   Admin: admin_user_001 (Admin Suparoek)');
    console.log('   User 1: john_doe_002 (John Doe)');
    console.log('   User 2: jane_smith_003 (Jane Smith)');
    console.log('   User 3: bob_wilson_004 (Bob Wilson)');
    console.log('   User 4: alice_brown_005 (Alice Brown)');
    
  } catch (error) {
    console.error('❌ Sample data creation failed:', error);
  } finally {
    await disconnectDB();
  }
}

// Run the script
createSampleData();
