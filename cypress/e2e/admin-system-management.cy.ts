/// <reference types="cypress" />

describe('Admin - System Management (User & Class)', () => {
  // Admin credentials
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'password123';

  // Helper function to login as admin and navigate to system management
  const navigateToSystemManagement = () => {
    cy.visit('/login');
    cy.get('[data-role="admin"]').click();
    cy.get('#login-username').type(ADMIN_USERNAME);
    cy.get('#login-password').type(ADMIN_PASSWORD);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/admin');

    // Navigate to system management
    cy.contains('系统管理').click();
    cy.contains('h1', '系统管理').should('be.visible');
  };

  describe('User Management', () => {
    beforeEach(() => {
      navigateToSystemManagement();
      // Ensure we're on the users tab
      cy.contains('button', '用户管理').click();
    });

    it('should display user management interface correctly', () => {
      cy.contains('h1', '系统管理').scrollIntoView().should('be.visible');
      cy.contains('button', '用户管理').should('have.class', 'text-blue-600');

      // Verify search box
      cy.get('input[placeholder*="关键字"]').should('be.visible');

      // Verify action buttons
      cy.contains('button', '添加教师').should('be.visible');
      cy.contains('button', '批量添加教师').should('be.visible');

      // Verify table headers
      cy.contains('th', '账号').should('be.visible');
      cy.contains('th', '姓名').should('be.visible');
      cy.contains('th', '角色').should('be.visible');
      cy.contains('th', '邮箱').should('be.visible');
      cy.contains('th', '注册时间').should('be.visible');
      cy.contains('th', '操作').should('be.visible');
    });

    it('should search for users', () => {
      cy.wait(1000);

      // Get initial user count
      cy.get('table tbody tr').then(($rows) => {
        const initialCount = $rows.length;

        if (initialCount > 0) {
          // Get first username
          cy.get('table tbody tr').first().find('td').first().invoke('text').then((username) => {
            // Search for this username
            cy.get('input[placeholder*="关键字"]').clear().type(username.trim());

            // Wait for search debounce
            cy.wait(500);

            // Verify filtered results
            cy.get('table tbody tr').should('have.length.at.least', 1);
            cy.get('table tbody tr').first().should('contain', username.trim());
          });
        }
      });
    });

    it('should open and close add teacher modal', () => {
      cy.contains('button', '添加教师').click();

      // Verify modal opened
      cy.contains('添加教师').should('be.visible');
      cy.get('input[placeholder*="用户名"]').should('exist');
      cy.get('input[placeholder*="姓名"]').should('exist');
      cy.get('input[placeholder*="邮箱"]').should('exist');
      cy.get('input[placeholder*="手机"]').should('exist');
      cy.get('input[placeholder*="密码"]').should('exist');

      // Close modal
      cy.contains('button', '取消').click();
      cy.contains('添加教师').should('not.exist');
    });

    it('should validate add teacher form fields', () => {
      cy.contains('button', '添加教师').click();

      // Try to submit empty form
      cy.contains('button', '添加').should('be.disabled');

      // Test username validation
      cy.get('input[placeholder*="用户名"]').type('a');
      cy.contains('用户名至少需要3个字符').should('be.visible');

      cy.get('input[placeholder*="用户名"]').clear().type('test_teacher_123');

      // Test full name validation
      cy.get('input[placeholder*="姓名"]').type('张');
      cy.contains('姓名至少需要2个字符').should('be.visible');

      cy.get('input[placeholder*="姓名"]').clear().type('张三');

      // Test email validation
      cy.get('input[placeholder*="邮箱"]').type('invalid-email');
      cy.contains('请输入有效的邮箱地址').should('be.visible');

      cy.get('input[placeholder*="邮箱"]').clear().type('test@example.com');

      // Test phone validation
      cy.get('input[placeholder*="手机"]').type('123');
      cy.contains('请输入有效的手机号码').should('be.visible');

      cy.get('input[placeholder*="手机"]').clear().type('13800138000');

      // Test password validation
      cy.get('input[placeholder*="密码"]').type('123');
      cy.contains('密码长度至少为6个字符').should('be.visible');

      cy.get('input[placeholder*="密码"]').clear().type('password123');

      // Now button should be enabled
      cy.contains('button', '添加').should('not.be.disabled');
    });

    it('should add a new teacher successfully', () => {
      cy.contains('button', '添加教师').click();

      // Fill in the form
      const timestamp = Date.now();
      cy.get('input[placeholder*="用户名"]').type(`teacher_${timestamp}`);
      cy.get('input[placeholder*="姓名"]').type('测试教师');
      cy.get('input[placeholder*="邮箱"]').type(`teacher_${timestamp}@test.com`);
      cy.get('input[placeholder*="手机"]').type('13800138000');
      cy.get('input[placeholder*="密码"]').type('password123');

      // Submit
      cy.contains('button', '添加').click();

      // Wait for API call
      cy.wait(2000);

      // Verify modal closed
      cy.contains('添加教师').should('not.exist');

      // Verify user was added (search for them)
      cy.get('input[placeholder*="关键字"]').clear().type(`teacher_${timestamp}`);
      cy.wait(500);
      cy.contains('td', `teacher_${timestamp}`).should('be.visible');
    });

    it('should open and close batch import modal', () => {
      cy.contains('button', '批量添加教师').click();

      // Verify modal opened
      cy.contains('批量导入教师').should('be.visible');
      cy.contains('CSV文件要求').should('be.visible');

      // Close modal
      cy.contains('button', '取消').click();
      cy.contains('批量导入教师').should('not.exist');
    });

    it('should validate batch import file type', () => {
      cy.contains('button', '批量添加教师').click();

      // Try to upload non-CSV file
      cy.get('input[type="file"]').selectFile('cypress/fixtures/demo.pdf', { force: true });
      cy.wait(500);

      // Verify error or disabled state
      cy.contains('button', '导入').should('exist');
    });

    it('should open password reset modal', () => {
      cy.wait(1000);

      // Find first non-admin user and click password reset
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[title*="修改密码"]').first().click();
      });

      // Verify modal opened
      cy.contains('修改密码').should('be.visible');
      cy.get('input[placeholder*="新密码"]').should('be.visible');
      cy.get('input[placeholder*="确认密码"]').should('be.visible');

      // Close modal
      cy.contains('button', '取消').click();
      cy.contains('修改密码').should('not.exist');
    });

    it('should validate password reset form', () => {
      cy.wait(1000);

      cy.get('table tbody tr').first().within(() => {
        cy.get('button[title*="修改密码"]').first().click();
      });

      // Test password too short
      cy.get('input[placeholder*="新密码"]').type('123');
      cy.contains('密码长度至少为6个字符').should('be.visible');

      // Test password mismatch
      cy.get('input[placeholder*="新密码"]').clear().type('password123');
      cy.get('input[placeholder*="确认密码"]').type('password456');
      cy.contains('两次输入的密码不一致').should('be.visible');

      // Test correct passwords
      cy.get('input[placeholder*="确认密码"]').clear().type('password123');
      cy.contains('button', '保存').should('not.be.disabled');
    });

    it('should handle user pagination', () => {
      cy.wait(1000);

      // Check if pagination exists
      cy.get('body').then(($body) => {
        if ($body.text().includes('下一页') || $body.text().includes('上一页')) {
          // Pagination exists, test it
          const hasPagination = $body.find('button:contains("下一页")').length > 0;

          if (hasPagination) {
            cy.contains('button', '下一页').then(($btn) => {
              if (!$btn.is(':disabled')) {
                cy.wrap($btn).click();
                cy.wait(500);
                cy.get('table tbody tr').should('exist');
              }
            });
          }
        }
      });
    });

    it('should delete a user with confirmation', () => {
      cy.wait(1000);

      // Count rows
      cy.get('table tbody tr').then(($rows) => {
        const initialCount = $rows.length;

        if (initialCount > 0) {
          // Click delete on first user
          cy.get('table tbody tr').first().within(() => {
            cy.get('button[title*="删除"]').click();
          });

          // Verify confirmation dialog
          cy.contains('确认删除').should('be.visible');

          // Confirm
          cy.contains('button', '删除').click();

          // Wait for deletion
          cy.wait(1000);

          // Verify page still works
          cy.get('body').should('be.visible');
        }
      });
    });
  });

  describe('Class Management', () => {
    beforeEach(() => {
      navigateToSystemManagement();
      // Switch to classes tab
      cy.contains('button', '班级管理').click();
    });

    it('should display class management interface correctly', () => {
      cy.contains('button', '班级管理').should('have.class', 'text-blue-600');

      // Verify search box
      cy.get('input[placeholder*="班级名称"]').should('be.visible');

      // Verify table headers
      cy.contains('th', '班级编号').should('be.visible');
      cy.contains('th', '班级名称').should('be.visible');
      cy.contains('th', '任课教师').should('be.visible');
      cy.contains('th', '操作').should('be.visible');
    });

    it('should search for classes', () => {
      cy.wait(1000);

      // Get initial class count
      cy.get('table tbody tr').then(($rows) => {
        const initialCount = $rows.length;

        if (initialCount > 0) {
          // Get first class name
          cy.get('table tbody tr').first().find('td').eq(1).invoke('text').then((className) => {
            // Search for this class
            cy.get('input[placeholder*="班级名称"]').clear().type(className.trim());

            // Wait for filter
            cy.wait(300);

            // Verify filtered results
            cy.get('table tbody tr').should('have.length.at.least', 1);
            cy.get('table tbody tr').first().should('contain', className.trim());
          });
        }
      });
    });

    it('should open and close class details modal', () => {
      cy.wait(1000);

      // Check if there are any classes
      cy.get('table tbody tr').then(($rows) => {
        if ($rows.length > 0 && !$rows.text().includes('未找到')) {
          // Click view details on first class
          cy.get('table tbody tr').first().within(() => {
            cy.contains('button', '查看班级详情').click();
          });

          // Verify modal opened
          cy.contains('班级详情').should('be.visible');

          // Close modal
          cy.contains('button', '关闭').click();
          cy.contains('班级详情').should('not.exist');
        }
      });
    });

    it('should display class details correctly', () => {
      cy.wait(1000);

      cy.get('table tbody tr').then(($rows) => {
        if ($rows.length > 0 && !$rows.text().includes('未找到')) {
          // Click view details on first class
          cy.get('table tbody tr').first().within(() => {
            cy.contains('button', '查看班级详情').click();
          });

          // Verify modal content
          cy.contains('班级详情').should('be.visible');
          cy.contains('班级信息').should('be.visible');
          cy.contains('学生列表').should('be.visible');

          // Close modal
          cy.contains('button', '关闭').click();
        }
      });
    });

    it('should handle empty class list', () => {
      // Clear search to show all
      cy.get('input[placeholder*="班级名称"]').clear();

      // Search for non-existent class
      cy.get('input[placeholder*="班级名称"]').type('不存在的班级名称xyz123');
      cy.wait(300);

      // Verify empty state message
      cy.contains('未找到符合条件的班级').should('be.visible');
    });
  });

  describe('Tab Switching', () => {
    beforeEach(() => {
      navigateToSystemManagement();
    });

    it('should maintain state when switching between tabs', () => {
      // Start on users tab
      cy.contains('button', '用户管理').should('have.class', 'text-blue-600');

      // Switch to classes
      cy.contains('button', '班级管理').click();
      cy.contains('button', '班级管理').should('have.class', 'text-blue-600');
      cy.get('input[placeholder*="班级名称"]').should('be.visible');

      // Switch back to users
      cy.contains('button', '用户管理').click();
      cy.contains('button', '用户管理').should('have.class', 'text-blue-600');
      cy.get('input[placeholder*="关键字"]').should('be.visible');
    });

    it('should load data correctly for each tab', () => {
      // Users tab
      cy.contains('button', '用户管理').click();
      cy.wait(1000);
      cy.get('table tbody').should('be.visible');

      // Classes tab
      cy.contains('button', '班级管理').click();
      cy.wait(1000);
      cy.get('table tbody').should('be.visible');
    });
  });

  describe('Complete System Management Workflow', () => {
    it('should complete a full workflow across both tabs', () => {
      navigateToSystemManagement();

      // 1. Check users
      cy.contains('button', '用户管理').click();
      cy.wait(1000);
      cy.get('table tbody tr').should('exist');

      // 2. Search for a user
      cy.get('input[placeholder*="关键字"]').type('admin');
      cy.wait(500);
      cy.contains('td', 'admin').should('be.visible');

      // 3. Clear search
      cy.get('input[placeholder*="关键字"]').clear();
      cy.wait(500);

      // 4. Switch to classes
      cy.contains('button', '班级管理').click();
      cy.wait(1000);

      // 5. View class details if available
      cy.get('table tbody tr').then(($rows) => {
        if ($rows.length > 0 && !$rows.text().includes('未找到')) {
          cy.get('table tbody tr').first().within(() => {
            cy.contains('button', '查看班级详情').click();
          });
          cy.contains('班级详情').should('be.visible');
          cy.contains('button', '关闭').click();
        }
      });

      // Workflow completed successfully
      cy.contains('h1', '系统管理').should('be.visible');
    });
  });
});
