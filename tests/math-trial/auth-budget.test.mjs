import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetFor} from '../../infra/math-trial/auth-budget.mjs';
test('full trial reserves three real child logins and parent plus two offline verifications',()=>{
  assert.deepEqual(budgetFor(null,1000,3),{needed:3,remaining:5,enough:true,waitSeconds:0});
  assert.equal(budgetFor({attempts:1,expiresAtMs:16000},1000,3).enough,true);
  assert.deepEqual(budgetFor({attempts:3,expiresAtMs:16000},1000,3),{needed:3,remaining:2,enough:false,waitSeconds:15});
  assert.equal(budgetFor({attempts:4,expiresAtMs:16000},1000,2).enough,false);
});
test('only natural window expiration restores budget; boundary is inclusive',()=>{
  const row={attempts:5,expiresAtMs:16000};
  assert.equal(budgetFor(row,15999,3).enough,false);
  assert.equal(budgetFor(row,16000,3).enough,true);
  assert.equal(row.attempts,5);
});
