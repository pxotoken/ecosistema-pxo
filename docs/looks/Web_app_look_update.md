# Web app look update

We need to revamp the look of the web (apps/web) module to look somehow similar to [tether.to](http://tether.to) 

We have screen captures of what is relevant about the [tether.to](http://tether.to) web application. These screen snapshots consist of a couple of .jpeg files that will be referenced where appropriate. These files are stored in the project’s docs/looks folder.

Keep the original color schema and typography of pxo’s site.

Replace all text references to ‘[tether.to](http://tether.to)’ to ‘[pxotoken.com](http://pxotoken.com)’

Replace all ‘tether’ logos with pxo’s logo

# (01) \- Account Creation/Log-in

Before the user is allowed to connect or create a wallet via Thirdweb, Terms and conditions should be accepted.

Please refer to docs/looks/tether\_tyc. 

The two items we want acceptance for are:

1. PXO \- (Replace text accordingly)  
2. FINLATAM \- (Replace text accordingly)

When the user clicks on any of the two checkmarks, a modal popup page should be presented with some place holder terms and conditions (to be replaced later when they are ready). This popup should have the ‘Disagree’ and ‘Accept’ appear when the end of the text is reached.

If the accept button is clicked, return and change the state of checkmarks

Ignore the Captcha component for now.

Just have one ‘Submit’ button at the end of the page so that when both items are checked the user can proceed to the Thirdweb wallet connect.

# (02) Main Screen

Please refer to docs/looks/tether\_balance\_page. 

Page layout should be the same as the provided screen capture with the following changes.

## Top Options

1. Do not include the ‘Anouncements’ option.  
2. After Thirdweb connection, user should land by default in the ‘Transactions’ options.  
3. Left menu should only be visible if user clicks on the use profile top option as shown in docs/looks/tether\_settings. Changes to left menu will be noted below under ‘Left Menu’  
 


## Balances

1. Only one tab with the pxo logo.  
2. The balances listed should be:  
   1. PXO  
   2. USDT  
   3. USDC  
   4. MGUSD (This balance is not available, just keep this in 0\)  
3. The ‘Recent Activity’ list should be presented under the ‘Transaction Activity’ pane to the right.  
     
4. ‘Acquire’ should go to the left of ‘Redeem’ and map like this:  
   1. Acquire \-\> Current ‘Buy with MXN’  
   2. Redeem \-\> Current ‘Redeem PXO’

## Bottom options

1. Transparency  
2. Legal  
3. Copyright notice: 2023 \- 2026 [Pxotoken.com](http://Pxotoken.com). All rights reserved.

No actions defined for Bottom options.

## Left Menu

1. Hide ‘Buy with MXN’  
2. Hide ‘Redeem PXO’

