import {test,expect} from '@playwright/test';
const password='LocalQaPassword!2026';
async function login(page,role){
 await page.goto('/');
 await page.getByLabel('Institution code').fill('DEMO');
 await page.getByLabel('Work email').fill(role+'@example.test');
 await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Open workspace'}).click();
 await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
}
async function navigate(page,name){await page.locator('nav').getByRole('button',{name,exact:true}).click();}
test('marketer converts a lead and manages an estimated opportunity',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page,'marketer');
 await navigate(page,'Leads & pipeline');
 await page.getByRole('button',{name:'+ Add lead',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Browser Customer');
 await page.getByLabel('Company',{exact:true}).fill('Browser Trading');
 await page.getByLabel('Email',{exact:true}).fill('browser@example.test');
 await page.getByRole('button',{name:'Save lead',exact:true}).click();
 await page.getByRole('button',{name:'Browser Customer'}).click();
 await page.getByRole('button',{name:'Convert to customer',exact:true}).click();
 await expect(page.getByText('Converted to a customer record.')).toBeVisible();
 await page.getByRole('button',{name:'Close dialog'}).click();
 await navigate(page,'Customers');
 await expect(page.getByRole('cell',{name:'Browser Customer',exact:true})).toBeVisible();
 await navigate(page,'Opportunities');
 await page.getByRole('button',{name:'+ Add opportunity',exact:true}).click();
 await page.getByLabel('Opportunity title').fill('Payroll opportunity');
 await page.getByLabel('Customer',{exact:true}).selectOption({label:'Browser Customer'});
 await page.getByLabel('Product',{exact:true}).fill('Business account');
 await page.getByLabel('Estimated value').fill('1250.25');
 await page.getByRole('button',{name:'Save opportunity',exact:true}).click();
 await page.getByRole('button',{name:'Payroll opportunity',exact:true}).click();
 await page.getByLabel('Stage',{exact:true}).selectOption('qualified');
 await page.getByRole('button',{name:'Save opportunity',exact:true}).click();
 await expect(page.getByRole('cell',{name:'Qualified',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});
test('sales head configures products and activity targets',async({page})=>{
 await login(page,'head');
 await navigate(page,'Products');
 await page.getByRole('button',{name:'+ Add product',exact:true}).click();
 await page.getByLabel('Product name').fill('Merchant services');
 await page.getByLabel('Category',{exact:true}).fill('Business');
 await page.getByRole('button',{name:'Save product',exact:true}).click();
 await expect(page.getByRole('cell',{name:'Merchant services',exact:true})).toBeVisible();
 await navigate(page,'Targets');
 await page.getByRole('button',{name:'+ Add target',exact:true}).click();
 await page.getByLabel('Staff member',{exact:true}).selectOption({label:'marketer'});
 await page.getByLabel('Goal',{exact:true}).fill('10');
 await page.getByLabel('Period starts').fill('2026-01-01');
 await page.getByLabel('Period ends').fill('2026-12-31');
 await page.getByRole('button',{name:'Save target',exact:true}).click();
 await expect(page.getByRole('cell',{name:'Leads Created',exact:true})).toBeVisible();
});
test('executive mobile workspace remains read-only',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await login(page,'executive');
 for(const name of ['Leads & pipeline','Customers','Opportunities','Targets','Products']){
  await navigate(page,name);
  await expect(page.getByRole('button',{name:/^\+ Add/})).toHaveCount(0);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Sign in to your bank'})).toBeVisible();
});
