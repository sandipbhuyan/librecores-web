<?php

namespace Librecores\ProjectRepoBundle\Controller;

use Librecores\ProjectRepoBundle\Entity\ClassificationHierarchy;
use Librecores\ProjectRepoBundle\Entity\Project;
use Librecores\ProjectRepoBundle\Entity\ProjectClassification;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Librecores\ProjectRepoBundle\Entity\Organization;
use Librecores\ProjectRepoBundle\Entity\User;
use Librecores\ProjectRepoBundle\Form\Type\SearchQueryType;
use Librecores\ProjectRepoBundle\Form\Model\SearchQuery;

class DefaultController extends Controller
{
    /**
     * Render the project overview page
     *
     * @return Response
     */
    public function indexAction()
    {
        return $this->render('LibrecoresProjectRepoBundle:Default:index.html.twig');
    }

    /**
     * Display a user or an organization
     *
     * @param string $userOrOrganization
     *
     * @return Response
     */
    public function userOrgViewAction($userOrOrganization)
    {
        $uoo = $this->getUserOrOrg($userOrOrganization);

        if ($uoo instanceof User) {
            return $this->forward(
                'LibrecoresProjectRepoBundle:User:view',
                array('user' => $uoo)
            );
        }
        if ($uoo instanceof Organization) {
            return $this->forward(
                'LibrecoresProjectRepoBundle:Organization:view',
                array('organization' => $uoo)
            );
        }

        // and 404 if it's neither
        throw $this->createNotFoundException('User or organization not found.');
    }

    /**
     * Display the organization settings page
     *
     * @param Request $request
     * @param string  $userOrOrganization name of the organization
     *
     * @return Response
     */
    public function userOrgSettingsAction(Request $request, $userOrOrganization)
    {
        $uoo = $this->getUserOrOrg($userOrOrganization);

        if ($uoo instanceof User) {
            if ($uoo->getId() !== $this->getUser()->getId()) {
                throw $this->createAccessDeniedException();
            }

            return $this->forward(
                'LibrecoresProjectRepoBundle:User:profileSettings',
                array('user' => $userOrOrganization)
            );
        }

        if ($uoo instanceof Organization) {
            return $this->forward(
                'LibrecoresProjectRepoBundle:Organization:settings',
                array('organization' => $uoo)
            );
        }

        // and 404 if it's neither
        throw $this->createNotFoundException('User or organization not found.');
    }

    /**
     * Search for a project
     *
     * @param Request $req
     *
     * @return Response
     */
    public function searchAction(Request $req)
    {
        $searchType = $req->get('type');
        $searchQuery = $req->get('query');

        // If searchType is null
        $searchType = ($searchType === null ? 'projects' : $searchType);

        return $this->render(
            'LibrecoresProjectRepoBundle:Default:project_search.html.twig',
            [
                'searchType' => $searchType,
                'searchQuery' => $searchQuery,
            ]
        );
    }

    /**
     * Search for a project classification
     *
     * @param Request $req
     *
     * @return Response
     */
    public function searchClassificationAction(Request $req)
    {
        $classifications = [];
        $searchResult = [];
        $searchQuery = $req->get('query');
        $indexManager = $this->get('search.index_manager');
        // Retrieve classification hierarchy
        $classificationCategories = $this->getDoctrine()->getManager()
            ->getRepository(ClassificationHierarchy::class)
            ->findAll();

        if ($searchQuery !== null) {
            $classificationsQuery = '';
            foreach ($searchQuery as $query) {
//                die(var_dump($classificationsQuery));
                $classificationsQuery = $classificationsQuery . ' ' . $query;
            }
            $searchResult = $indexManager->rawSearch($classificationsQuery, Project::class);
        }

        foreach ($classificationCategories as $category) {
            $temp = [
                "id" => $category->getId(),
                "parentId" => $category->getParent() == null ?
                    $category->getParent(): $category->getParent()->getId(),
                "name" => $category->getName(),
            ];
            $classifications[] = $temp;
        }
        // Get classification hierarchy tree
        $classificationHierarchy = $this->buildTree($classifications);

        return $this->render(
            'LibrecoresProjectRepoBundle:Default:classification_search.html.twig',
            [
                'classificationHierarchy' => $classificationHierarchy,
                'classificationDetails' => $classifications,
                'searchResult' => $searchResult,
                'searchQuery' => $searchQuery,
            ]
        );
    }

    public function removeTrailingSlashAction(Request $request)
    {
        $pathInfo = $request->getPathInfo();
        $requestUri = $request->getRequestUri();

        $url = str_replace($pathInfo, rtrim($pathInfo, ' /'), $requestUri);

        return $this->redirect($url, 301);
    }

    /**
     * Get an user or organization entity with the given name
     *
     * @param string $userOrOrganization
     *
     * @return User|Organization|null user or organization entity, or null if
     *   no entity with the given name exists.
     */
    private function getUserOrOrg($userOrOrganization)
    {
        // try user first
        $user = $this->getDoctrine()
        ->getRepository('LibrecoresProjectRepoBundle:User')
        ->findOneByUsername($userOrOrganization);

        if ($user !== null) {
            return $user;
        }

        // then organization
        $org = $this->getDoctrine()
        ->getRepository('LibrecoresProjectRepoBundle:Organization')
        ->findOneByName($userOrOrganization);

        return $org;
    }

    /**
     * Build a classification hierarchy tree
     *
     * @param array $elements The sub-classifiers of a parent classifier
     * @param int   $parentId The parent classifier id of the sub-classifiers
     *
     * @return array
     */
    private function buildTree(array $elements, $parentId = 0) {
        $branch = [];

        foreach ($elements as $element) {
            if ($element['parentId'] == $parentId) {
                $children = $this->buildTree($elements, $element['id']);
                if ($children) {
                    $element['children'] = $children;
                }
                $branch[] = $element;
            }
        }

        return $branch;
    }
}
