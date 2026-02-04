import { connectDB } from '@/lib/mongodb';
import Portfolio from '@/lib/models/Portfolio';
import Trade from '@/lib/models/Trade';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { type, cryptoSymbol, amount, pricePerUnit } = await request.json();

    // Validation
    if (!type || !cryptoSymbol || !amount || !pricePerUnit) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!['buy', 'sell'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid trade type' },
        { status: 400 }
      );
    }

    if (amount <= 0 || pricePerUnit <= 0) {
      return NextResponse.json(
        { error: 'Amount and price must be greater than 0' },
        { status: 400 }
      );
    }

    // Get portfolio
    let portfolio = await Portfolio.findOne({ userId: decoded.userId });

    if (!portfolio) {
      portfolio = new Portfolio({
        userId: decoded.userId,
        accountBalance: 10000,
      });
    }

    const totalValue = amount * pricePerUnit;

    // Handle buy trade
    if (type === 'buy') {
      if (portfolio.accountBalance < totalValue) {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        );
      }

      // Deduct from account balance
      portfolio.accountBalance -= totalValue;
      portfolio.totalInvested += totalValue;

      // Update or add holding
      const existingHolding = portfolio.holdings?.find(
        (h: any) => h.cryptoSymbol === cryptoSymbol.toUpperCase()
      );

      if (existingHolding) {
        const totalAmount = existingHolding.amount + amount;
        const newAverageBuyPrice =
          (existingHolding.averageBuyPrice * existingHolding.amount + pricePerUnit * amount) /
          totalAmount;

        existingHolding.amount = totalAmount;
        existingHolding.averageBuyPrice = newAverageBuyPrice;
        existingHolding.totalValue = totalAmount * pricePerUnit;
        existingHolding.currentPrice = pricePerUnit;
        existingHolding.gainLoss = existingHolding.totalValue - totalAmount * newAverageBuyPrice;
        existingHolding.gainLossPercent = (existingHolding.gainLoss / (totalAmount * newAverageBuyPrice)) * 100;
      } else {
        portfolio.holdings!.push({
          cryptoSymbol: cryptoSymbol.toUpperCase(),
          amount,
          averageBuyPrice: pricePerUnit,
          currentPrice: pricePerUnit,
          totalValue,
          gainLoss: 0,
          gainLossPercent: 0,
        });
      }
    }

    // Handle sell trade
    if (type === 'sell') {
      const holding = portfolio.holdings?.find(
        (h: any) => h.cryptoSymbol === cryptoSymbol.toUpperCase()
      );

      if (!holding || holding.amount < amount) {
        return NextResponse.json(
          { error: 'Insufficient holdings to sell' },
          { status: 400 }
        );
      }

      // Add to account balance
      portfolio.accountBalance += totalValue;

      // Calculate gain/loss from this sale
      const costBasis = holding.averageBuyPrice * amount;
      const gainLoss = totalValue - costBasis;
      portfolio.totalReturns += gainLoss;

      // Update holding
      holding.amount -= amount;
      if (holding.amount === 0) {
        // Remove holding if amount is 0
        portfolio.holdings = portfolio.holdings?.filter(
          (h: any) => h.cryptoSymbol !== cryptoSymbol.toUpperCase()
        );
      } else {
        holding.totalValue = holding.amount * pricePerUnit;
        holding.currentPrice = pricePerUnit;
        holding.gainLoss = holding.totalValue - holding.amount * holding.averageBuyPrice;
        holding.gainLossPercent = (holding.gainLoss / (holding.amount * holding.averageBuyPrice)) * 100;
      }
    }

    // Create trade record
    const transactionId = crypto.randomBytes(8).toString('hex').toUpperCase();

    const trade = new Trade({
      userId: decoded.userId,
      type,
      cryptoSymbol: cryptoSymbol.toUpperCase(),
      amount,
      pricePerUnit,
      totalValue,
      status: 'completed',
      transactionId,
    });

    await trade.save();
    await portfolio.save();

    return NextResponse.json(
      {
        message: `${type === 'buy' ? 'Buy' : 'Sell'} order placed successfully`,
        trade,
        portfolio,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Place trade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
