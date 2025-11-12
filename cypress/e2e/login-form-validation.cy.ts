/// <reference types="cypress" />

describe('Login Form - Role Switch Validation', () => {
  beforeEach(() => {
    // 访问登录页面
    cy.visit('/login');
  });

  it('should clear validation error when switching roles', () => {
    // 1. 验证默认选中学生角色
    cy.get('[data-role="student"]').should('have.class', 'ring-2');

    // 2. 在学生角色下输入 "admin"（应该触发验证错误，因为学生需要数字学号）
    cy.get('#login-username').type('admin');

    // 3. 移开焦点以触发验证
    cy.get('#login-password').click();

    // 4. 验证显示了验证错误信息
    cy.get('#login-username-error').should('be.visible');
    cy.get('#login-username-error').should('contain', '学号');

    // 5. 验证输入框有错误样式
    cy.get('#login-username').should('have.class', 'border-red-500');

    // 6. 切换到 admin 角色
    cy.get('[data-role="admin"]').click();

    // 7. 验证错误信息消失
    cy.get('#login-username-error').should('not.exist');

    // 8. 验证输入框被清空
    cy.get('#login-username').should('have.value', '');
    cy.get('#login-password').should('have.value', '');

    // 9. 验证输入框没有错误样式
    cy.get('#login-username').should('not.have.class', 'border-red-500');
  });

  it('should allow valid input after role switch', () => {
    // 1. 在学生角色输入无效内容
    cy.get('#login-username').type('admin');
    cy.get('#login-password').click();

    // 2. 验证有错误
    cy.get('#login-username-error').should('be.visible');

    // 3. 切换到 admin 角色
    cy.get('[data-role="admin"]').click();

    // 4. 输入有效的 admin 用户名
    cy.get('#login-username').type('admin');

    // 5. 验证没有错误信息
    cy.get('#login-username-error').should('not.exist');

    // 6. 输入密码
    cy.get('#login-password').type('password123');

    // 7. 验证登录按钮可点击
    cy.get('button[type="submit"]').should('not.be.disabled');
  });

  it('should handle multiple role switches correctly', () => {
    // 1. 在学生角色输入错误格式
    cy.get('#login-username').type('abc123');
    cy.get('#login-password').click();
    cy.get('#login-username-error').should('be.visible');

    // 2. 切换到教师角色
    cy.get('[data-role="teacher"]').click();
    cy.get('#login-username-error').should('not.exist');
    cy.get('#login-username').should('have.value', '');

    // 3. 输入教师用户名
    cy.get('#login-username').type('teacher001');

    // 4. 切换回学生角色
    cy.get('[data-role="student"]').click();
    cy.get('#login-username').should('have.value', '');

    // 5. 输入有效学号
    cy.get('#login-username').type('20230001');
    cy.get('#login-username-error').should('not.exist');
  });

  it('should show correct placeholder and label for each role', () => {
    // 学生角色
    cy.get('[data-role="student"]').should('have.class', 'ring-2');
    cy.get('label[for="login-username"]').should('contain', '学号');
    cy.get('#login-username').should('have.attr', 'placeholder').and('contain', '学号');

    // 切换到教师角色
    cy.get('[data-role="teacher"]').click();
    cy.get('label[for="login-username"]').should('contain', '用户名');
    cy.get('#login-username').should('have.attr', 'placeholder').and('contain', '用户名');

    // 切换到管理员角色
    cy.get('[data-role="admin"]').click();
    cy.get('label[for="login-username"]').should('contain', '用户名');
  });
});
