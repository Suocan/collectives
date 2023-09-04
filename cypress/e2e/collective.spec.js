/**
 * @copyright Copyright (c) 2021 Azul <azul@riseup.net>
 *
 * @author Azul <azul@riseup.net>
 *
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/**
 *  Tests for basic Collectives functionality.
 */

describe('Collective', function() {
	const specialCollective = 'stupid !@#$%^&()_ special chars'

	before(function() {
		cy.login('bob')
		cy.deleteCollective('Preexisting Circle')
		cy.deleteCollective('History Club')
		cy.deleteCollective(specialCollective)
		cy.deleteAndSeedCollective('Preexisting Collective')
		cy.seedCircleMember('Preexisting Collective', 'jane')
		cy.seedCircle('Preexisting Circle')
		cy.seedCircle('History Club', { visible: true, open: true })
		cy.login('jane')
		cy.deleteCollective('Foreign Circle')
		cy.seedCircle('Foreign Circle', { visible: true, open: true })
	})

	describe('in the files app', function() {
		before(function() {
			cy.login('bob', { route: '/apps/files' })
		})
		it('has a matching folder', function() {
			const fileListSelector = '.files-fileList a, [data-cy-files-list-row] a'
			const breadcrumbsSelector = '.files-controls .breadcrumb, [data-cy-files-content-breadcrumbs] a'
			cy.get(fileListSelector).should('contain', 'Collectives')
			cy.get(fileListSelector).contains('Collectives').click()
			cy.get(breadcrumbsSelector).should('contain', 'Collectives')
			cy.get(fileListSelector).should('contain', 'Preexisting Collective')
			cy.get(fileListSelector).contains('Preexisting Collective').click()
			cy.get(breadcrumbsSelector).should('contain', 'Preexisting Collective')
			cy.get(fileListSelector).should('contain', 'Readme')
			cy.get(fileListSelector).should('contain', '.md')
			cy.get('.filelist-collectives-wrapper')
				.should('contain', 'The content of this folder is best viewed in the Collectives app.')
		})
	})

	describe('name conflicts', function() {
		it('Reports existing circle', function() {
			cy.login('bob')
			cy.createCollective('Foreign Circle')
			cy.get('.modal-collective-name-error').should('contain', 'A collective with this name already exists')
		})
		it('Reports existing collective', function() {
			cy.login('bob')
			cy.createCollective('Preexisting Collective')
			cy.get('main .empty-content').should('contain', 'build shared knowledge')
			cy.get('.toast-warning').should('contain', 'Could not create the collective')
			cy.get('.toast-warning').should('contain', 'Collective already exists')
		})
		it('creates collectives by picking circle',
			function() {
				cy.login('bob')
				cy.get('button').contains('New collective').click()
				cy.get('button span.circles-icon').click()
				// cy.get('.circle-selector ul').should('not.contain', 'Foreign')
				cy.get('.circle-selector li [title*=History]').click()
				cy.get('button').contains('Add people').click()
				cy.get('button').contains('Create').click()

				cy.get('#titleform input').invoke('val').should('contain', 'History Club')
				cy.get('.toast-info').should('contain',
					'Created collective "History Club" for existing circle.',
				)
			})
		it('collectives of visible circles only show for members',
			function() {
				cy.login('jane')
				cy.get('.app-navigation-entry').should('not.contain', 'History Club')
			})
		it('creates collectives for admins of corresponding circle',
			function() {
				cy.login('bob')
				cy.createCollective('Preexisting Circle')
				cy.get('#titleform input').invoke('val').should('contain', 'Preexisting Circle')
				cy.get('.toast-info').should('contain',
					'Created collective "Preexisting Circle" for existing circle.',
				)
			})
		after(function() {
			cy.deleteCollective('Preexisting Circle')
			cy.deleteCollective('History Club')
		})
	})

	describe('non ascii characters', function() {
		it('can handle special chars in collective name',
			function() {
				cy.login('bob')
				cy.createCollective(specialCollective)
				cy.get('#titleform input').invoke('val').should('contain', specialCollective)
			})

		after(function() {
			cy.deleteCollective(specialCollective)
		})
	})
	// Note: the different assertions in here
	// all happen without any page reload or navigation.
	//
	// Cookies are cleared after every test.
	// So in all but the first run it block
	// bob will be logged out.
	describe('after creation', function() {
		const randomName = 'Created just now ' + Math.random().toString(36).substr(2, 4)
		it('has all the ui elements', function() {
			cy.login('bob')
			cy.createCollective(randomName, ['jane', 'john'])
			cy.log('Check name in the disabled titleform')
			cy.get('#titleform input').invoke('val').should('contain', randomName)
			cy.get('#titleform input').should('have.attr', 'disabled')
			cy.log('Check initial Readme.md')
			cy.get('#text h1').should('contain', 'Welcome to your new collective')
			cy.log('Allows creation of pages')
			cy.get('.app-content-list-item')
				.trigger('mouseover')
			cy.get('.app-content-list button.action-button-add')
				.should('have.attr', 'aria-label')
				.and('contain', 'Add a page')
			cy.deleteCollective(randomName)
		})
	})

	describe('in non-admin collective', function() {
		it('can leave collective and undo', function() {
			cy.login('jane')
			cy.visit('/apps/collectives')

			// Leave collective
			cy.get('.collectives_list_item')
				.contains('li', 'Preexisting Collective')
				.find('.action-item__menutoggle')
				.click({ force: true })
			cy.get('button.action-button')
				.contains('Leave collective')
				.click()
			cy.get('.app-navigation-entry')
				.contains('Preexisting Collective')
				.should('not.be.visible')

			// Undo leave collective
			cy.get('.toast-undo')
				.should('contain', 'Left collective Preexisting Collective')
			cy.get('.toast-undo button')
				.should('contain', 'Undo')
				.click()

			cy.get('.app-navigation-entry')
				.contains('Preexisting Collective')
				.should('be.visible')

			// Leave collective and wait for 10 seconds
			cy.get('.collectives_list_item')
				.contains('li', 'Preexisting Collective')
				.find('.action-item__menutoggle')
				.click({ force: true })
			cy.intercept('PUT', '**/apps/circles/circles/**/leave').as('leaveCircle')
			cy.get('button.action-button')
				.contains('Leave collective')
				.click()
			cy.get('.app-navigation-entry')
				.contains('Preexisting Collective')
				.should('not.be.visible')
			// Wait 10 extra seconds for the request (undo period)
			cy.wait('@leaveCircle', { requestTimeout: Cypress.config('requestTimeout') + 10010 })
			cy.get('.app-navigation__list')
				.contains('Preexisting Collective')
				.should('not.exist')
		})
	})

	describe('reloading works', function() {
		before(function() {
			cy.login('bob', { route: '/apps/collectives/Preexisting%20Collective' })
			cy.get('#titleform input').should('have.value', 'Preexisting Collective')
		})
		it('Shows the name in the disabled titleform', function() {
			cy.reload()
			cy.get('#titleform input').should('have.value', 'Preexisting Collective')
		})
	})
})
